const { histogramToRows, toLevel, toPhotoRow, DAY_INDEX } = require('./apifyTypical');

describe('toLevel', () => {
  it.each([
    [0, 0],
    [undefined, 0],
    [null, 0],
    ['x', 0],
    [-5, 0],
    [1, 1],
    [33, 1],
    [34, 2],
    [66, 2],
    [67, 3],
    [100, 3],
    [140, 3],
  ])('punteggio %p → livello %p', (score, level) => {
    expect(toLevel(score)).toBe(level);
  });
});

describe('histogramToRows', () => {
  it('legge l’oggetto per giorno { Su: [{hour, occupancyPercent}] } con 0 = domenica', () => {
    const rows = histogramToRows('ChIJa', {
      Su: [{ hour: 23, occupancyPercent: 80 }],
      Sa: [{ hour: 0, occupancyPercent: 40 }],
    });
    expect(rows).toEqual([
      { google_place_id: 'ChIJa', weekday: 0, hour: 23, level: 3 },
      { google_place_id: 'ChIJa', weekday: 6, hour: 0, level: 2 },
    ]);
  });

  it('legge l’array per giorno con day e popular_times [{hour, percentage}]', () => {
    const rows = histogramToRows('ChIJa', [
      { day: 'Monday', popular_times: [{ hour: 21, percentage: 10 }] },
      { day: 'friday', popular_times: [{ hour: 22, percentage: 0 }] },
    ]);
    expect(rows).toEqual([
      { google_place_id: 'ChIJa', weekday: 1, hour: 21, level: 1 },
      { google_place_id: 'ChIJa', weekday: 5, hour: 22, level: 0 },
    ]);
  });

  it('accetta nomi dei giorni in forma breve, estesa e in minuscolo', () => {
    expect(DAY_INDEX.mo).toBe(1);
    expect(DAY_INDEX.sunday).toBe(0);
    expect(DAY_INDEX.sat).toBe(6);
  });

  it('ignora qualsiasi altro campo, anche dentro le celle e i dati live', () => {
    const rows = histogramToRows('ChIJa', {
      Mo: [{ hour: 20, occupancyPercent: 50, title: 'Nome', reviews: ['x'] }],
      live: [{ hour: 20, occupancyPercent: 99 }],
      popularTimesLivePercent: 90,
      popularTimesLiveText: 'Più affollato del solito',
    });
    expect(rows).toEqual([{ google_place_id: 'ChIJa', weekday: 1, hour: 20, level: 2 }]);
    expect(Object.keys(rows[0]).sort()).toEqual(['google_place_id', 'hour', 'level', 'weekday']);
  });

  it('scarta celle con ora non valida e giorni sconosciuti', () => {
    expect(
      histogramToRows('ChIJa', {
        Mo: [
          { hour: 24, occupancyPercent: 50 },
          { hour: 'x', occupancyPercent: 50 },
          { hour: 1.5, occupancyPercent: 50 },
        ],
        Xx: [{ hour: 1, occupancyPercent: 50 }],
      }),
    ).toEqual([]);
  });

  it('un place senza Popular times non produce righe (non è "chiuso")', () => {
    expect(histogramToRows('ChIJa', undefined)).toEqual([]);
    expect(histogramToRows('ChIJa', null)).toEqual([]);
    expect(histogramToRows('ChIJa', {})).toEqual([]);
    expect(histogramToRows('ChIJa', 'boh')).toEqual([]);
  });

  it('con celle duplicate vince l’ultima', () => {
    const rows = histogramToRows('ChIJa', {
      Mo: [
        { hour: 5, occupancyPercent: 10 },
        { hour: 5, occupancyPercent: 90 },
      ],
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].level).toBe(3);
  });
});

describe('toPhotoRow', () => {
  it('accetta https su googleusercontent.com e sottodomini', () => {
    expect(toPhotoRow('ChIJa', 'https://lh3.googleusercontent.com/p/abc=w800')).toEqual({
      google_place_id: 'ChIJa',
      image_url: 'https://lh3.googleusercontent.com/p/abc=w800',
    });
    expect(toPhotoRow('ChIJa', 'https://googleusercontent.com/x')).not.toBeNull();
  });

  it('rifiuta http, altri host, trucchi di host e valori non stringa', () => {
    const bad = [
      'http://lh3.googleusercontent.com/x',
      'https://evil.example.com/x',
      'https://googleusercontent.com.evil.example.com/x',
      'https://lh3.googleusercontent.com@evil.example.com/x',
      'https://notgoogleusercontent.com/x',
      'javascript:alert(1)',
      '',
      undefined,
      null,
      42,
    ];
    for (const url of bad) expect(toPhotoRow('ChIJa', url)).toBeNull();
  });
});
