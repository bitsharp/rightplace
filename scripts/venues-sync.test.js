const { buildSyncRequest, formatSyncSummary, parseSyncArgs } = require('./venues-sync');
const { MissingEnvError, readServiceEnv } = require('./lib/serviceEnv');

const env = {
  SUPABASE_URL: 'https://abc.supabase.co/',
  SUPABASE_SERVICE_ROLE_KEY: 'chiave-di-servizio',
};

describe('readServiceEnv', () => {
  it('restituisce url (senza slash finale) e chiave', () => {
    expect(readServiceEnv(env)).toEqual({
      url: 'https://abc.supabase.co',
      serviceRoleKey: 'chiave-di-servizio',
    });
  });

  it('elenca tutte le variabili mancanti', () => {
    expect(() => readServiceEnv({})).toThrow(MissingEnvError);
    expect(() => readServiceEnv({})).toThrow(/SUPABASE_URL.*SUPABASE_SERVICE_ROLE_KEY/);
  });

  it('spiega che serve la chiave service_role legacy in formato JWT', () => {
    expect(() => readServiceEnv({})).toThrow(/LEGACY.*JWT/);
  });

  it('tratta le variabili vuote come mancanti', () => {
    expect(() => readServiceEnv({ ...env, SUPABASE_URL: '  ' })).toThrow(/SUPABASE_URL/);
  });
});

describe('parseSyncArgs', () => {
  it('legge una o più città, dry-run e tetto richieste', () => {
    expect(
      parseSyncArgs([
        '--city',
        'milano',
        '--city',
        'las-palmas',
        '--dry-run',
        '--max-requests',
        '6',
      ]),
    ).toEqual({ cities: ['milano', 'las-palmas'], dryRun: true, maxRequests: 6 });
  });

  it('i default sono: nessun dry-run e 10 richieste', () => {
    expect(parseSyncArgs(['--city', 'milano'])).toEqual({
      cities: ['milano'],
      dryRun: false,
      maxRequests: 10,
    });
  });

  it('richiede almeno una città valida', () => {
    expect(() => parseSyncArgs([])).toThrow(/--city/);
    expect(() => parseSyncArgs(['--city'])).toThrow(/--city/);
    expect(() => parseSyncArgs(['--city', 'Milano!'])).toThrow(/città/);
  });

  it('rifiuta un tetto fuori da 1–20 o non numerico', () => {
    for (const bad of ['0', '21', 'x', '2.5']) {
      expect(() => parseSyncArgs(['--city', 'milano', '--max-requests', bad])).toThrow(
        /max-requests/,
      );
    }
  });

  it('rifiuta opzioni sconosciute e il vecchio argomento posizionale', () => {
    expect(() => parseSyncArgs(['--city', 'milano', '--boh'])).toThrow(/--boh/);
    expect(() => parseSyncArgs(['milano'])).toThrow(/milano/);
  });
});

describe('buildSyncRequest', () => {
  it('fa POST a places-sync con la service role e le opzioni nel corpo', () => {
    const { url, init } = buildSyncRequest(env, {
      citySlug: 'milano',
      dryRun: true,
      maxRequests: 7,
    });
    expect(url).toBe('https://abc.supabase.co/functions/v1/places-sync');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer chiave-di-servizio');
    expect(JSON.parse(init.body)).toEqual({ city_slug: 'milano', max_requests: 7, dry_run: true });
  });

  it('fallisce con un errore chiaro se mancano le variabili', () => {
    expect(() =>
      buildSyncRequest({}, { citySlug: 'milano', dryRun: false, maxRequests: 10 }),
    ).toThrow(MissingEnvError);
  });
});

describe('formatSyncSummary', () => {
  it('riassume il conteggio reale per città e il totale', () => {
    const summary = formatSyncSummary([
      { city: 'milano', calls: 10, inserted: 25, updated: 5, demo_deactivated: 20 },
      { city: 'las-palmas', calls: 9, inserted: 12, updated: 0, demo_deactivated: 0 },
    ]);
    expect(summary).toEqual([
      'milano: 10 chiamate Places, 25 inseriti, 5 aggiornati, 20 demo disattivati',
      'las-palmas: 9 chiamate Places, 12 inseriti, 0 aggiornati, 0 demo disattivati',
      'Totale: 19 chiamate Places',
    ]);
  });

  it('in dry-run mostra il conteggio stimato e non scrive nulla', () => {
    const summary = formatSyncSummary([
      { city: 'milano', dry_run: true, estimated_calls: 10, queries: [] },
    ]);
    expect(summary).toEqual([
      'milano (dry run): 10 chiamate Places stimate, nessuna eseguita',
      'Totale: 10 chiamate Places stimate',
    ]);
  });

  it('segnala le città fallite', () => {
    const summary = formatSyncSummary([{ city: 'madrid', error: 'CITY_NOT_ACTIVE' }]);
    expect(summary[0]).toBe('madrid: errore CITY_NOT_ACTIVE');
  });
});
