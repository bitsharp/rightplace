const {
  buildImportRequest,
  expandTypicalRows,
  parseImportArgs,
  parseTypicalCsv,
  TYPICAL_CSV_HEADER,
} = require('./typical-import');

const csv = (...lines) => [TYPICAL_CSV_HEADER, ...lines].join('\n');

describe('parseImportArgs', () => {
  it('legge --city e usa il file di default della città', () => {
    expect(parseImportArgs(['--city', 'milano'])).toEqual({
      city: 'milano',
      file: expect.stringMatching(/supabase[\\/]seed[\\/]typical_busyness_milano\.csv$/),
    });
  });

  it('accetta --file', () => {
    expect(parseImportArgs(['--city', 'las-palmas', '--file', 'mio.csv']).file).toBe('mio.csv');
  });

  it('richiede una sola città valida e rifiuta opzioni sconosciute', () => {
    expect(() => parseImportArgs([])).toThrow(/--city/);
    expect(() => parseImportArgs(['--city', 'A B'])).toThrow(/città/);
    expect(() => parseImportArgs(['--city', 'milano', '--x'])).toThrow(/--x/);
  });
});

describe('parseTypicalCsv', () => {
  it('legge le righe e converte i numeri', () => {
    const { rows, errors } = parseTypicalCsv(csv('ChIJa,5,23,4,3', 'ChIJb,6,19,23,2'));
    expect(errors).toEqual([]);
    expect(rows).toEqual([
      { google_place_id: 'ChIJa', weekday: 5, hour_from: 23, hour_to: 4, level: 3 },
      { google_place_id: 'ChIJb', weekday: 6, hour_from: 19, hour_to: 23, level: 2 },
    ]);
  });

  it('un file con il solo header è valido e vuoto', () => {
    expect(parseTypicalCsv(`${TYPICAL_CSV_HEADER}\n`)).toEqual({ rows: [], errors: [] });
  });

  it('ignora righe vuote e commenti, e accetta CRLF', () => {
    const text = `${TYPICAL_CSV_HEADER}\r\n# nota\r\n\r\nChIJa,0,0,1,1\r\n`;
    expect(parseTypicalCsv(text).rows).toHaveLength(1);
  });

  it('rifiuta un header diverso', () => {
    expect(parseTypicalCsv('place,day\nChIJa,1').errors[0]).toMatch(/header/i);
  });

  it('accetta le ore 0–23 incluse in entrambi i campi', () => {
    expect(parseTypicalCsv(csv('ChIJa,0,0,23,1')).errors).toEqual([]);
  });

  it('segnala riga e motivo per ogni valore fuori range', () => {
    const { errors, rows } = parseTypicalCsv(
      csv(
        ',1,1,2,1',
        'ChIJa,7,1,2,1',
        'ChIJa,1,24,2,1',
        'ChIJa,1,1,24,1',
        'ChIJa,1,1,2,4',
        'ChIJa,1,x,2,1',
        'ChIJa,1,1,2',
      ),
    );
    expect(rows).toEqual([]);
    expect(errors).toHaveLength(7);
    expect(errors[0]).toMatch(/riga 2/);
    expect(errors[1]).toMatch(/riga 3.*weekday/);
    expect(errors[2]).toMatch(/riga 4.*hour_from/);
    expect(errors[3]).toMatch(/riga 5.*hour_to/);
    expect(errors[4]).toMatch(/riga 6.*level/);
  });
});

describe('expandTypicalRows', () => {
  const row = (weekday, hour_from, hour_to, level = 2) => ({
    google_place_id: 'ChIJa',
    weekday,
    hour_from,
    hour_to,
    level,
  });
  const cells = (rows) => rows.map((r) => `${r.weekday}:${r.hour}`);

  it('espande una fascia nello stesso giorno con ore estremi inclusi', () => {
    expect(cells(expandTypicalRows([row(4, 19, 21)]))).toEqual(['4:19', '4:20', '4:21']);
  });

  it('hour_to = hour_from è una sola ora', () => {
    expect(cells(expandTypicalRows([row(4, 22, 22)]))).toEqual(['4:22']);
  });

  it('fino alle 23 incluse', () => {
    expect(cells(expandTypicalRows([row(4, 22, 23)]))).toEqual(['4:22', '4:23']);
  });

  it('se hour_to < hour_from la fascia scavalla la mezzanotte sul giorno dopo', () => {
    expect(cells(expandTypicalRows([row(5, 23, 2)]))).toEqual(['5:23', '6:0', '6:1', '6:2']);
  });

  it('da sabato (6) scavalla su domenica (0)', () => {
    expect(cells(expandTypicalRows([row(6, 23, 1)]))).toEqual(['6:23', '0:0', '0:1']);
  });

  it('da domenica (0) scavalla su lunedì (1)', () => {
    expect(cells(expandTypicalRows([row(0, 22, 0)]))).toEqual(['0:22', '0:23', '1:0']);
  });

  it('porta con sé place_id e livello, e deduplica le celle (l’ultima riga vince)', () => {
    expect(expandTypicalRows([row(1, 20, 21, 1), row(1, 21, 22, 3)])).toEqual([
      { google_place_id: 'ChIJa', weekday: 1, hour: 20, level: 1 },
      { google_place_id: 'ChIJa', weekday: 1, hour: 21, level: 3 },
      { google_place_id: 'ChIJa', weekday: 1, hour: 22, level: 3 },
    ]);
  });
});

describe('buildImportRequest', () => {
  const env = { SUPABASE_URL: 'https://abc.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'chiave' };
  const cells = [{ google_place_id: 'ChIJa', weekday: 5, hour: 23, level: 3 }];

  it('chiama la RPC import_typical_manual con la service role, tutte le celle in una sola richiesta', () => {
    const { url, init } = buildImportRequest(env, 'milano', cells);
    expect(url).toBe('https://abc.supabase.co/rest/v1/rpc/import_typical_manual');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer chiave');
    expect(init.headers.apikey).toBe('chiave');
    expect(JSON.parse(init.body)).toEqual({ p_city_slug: 'milano', p_rows: cells });
  });

  it('fallisce con un errore chiaro se mancano le variabili', () => {
    expect(() => buildImportRequest({}, 'milano', cells)).toThrow(/SUPABASE_URL/);
  });
});
