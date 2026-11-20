const {
  chunk,
  filterPlaceIds,
  isEnabled,
  isPhotosEnabled,
  parseApifyArgs,
  readApifyEnv,
  run,
  summarize,
} = require('./typical-apify');

const TOKEN = 'apify_api_SEGRETISSIMO';
const env = {
  TYPICAL_APIFY_ENABLED: 'true',
  APIFY_TOKEN: TOKEN,
  SUPABASE_URL: 'https://x.supabase.co/',
  SUPABASE_SERVICE_ROLE_KEY: 'srv-key',
};

const json = (body, status = 200) => ({
  ok: status < 400,
  status,
  json: async () => body,
});

// Fake network: Supabase REST + Apify. Records every call.
function makeFetch({ placeIds, apify, rpc } = {}) {
  const calls = [];
  const fetchFn = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    if (String(url).includes('/rest/v1/venues'))
      return json((placeIds ?? []).map((id) => ({ google_place_id: id })));
    if (String(url).includes('api.apify.com')) return (apify ?? (() => json([])))(calls.length);
    if (String(url).includes('/rpc/import_typical_apify')) return (rpc ?? (() => json(1)))();
    if (String(url).includes('/rpc/import_venue_photos_apify')) return json(1);
    throw new Error(`rete inattesa: ${url}`);
  };
  return { fetchFn, calls };
}
const histogram = { Sa: [{ hour: 23, occupancyPercent: 90 }] };
const noSleep = async () => {};

describe('parseApifyArgs', () => {
  it('legge --city, --dry-run e --limit (default 200)', () => {
    expect(parseApifyArgs(['--city', 'milano'])).toEqual({
      city: 'milano',
      dryRun: false,
      limit: 200,
    });
    expect(parseApifyArgs(['--city', 'milano', '--dry-run', '--limit', '30'])).toEqual({
      city: 'milano',
      dryRun: true,
      limit: 30,
    });
  });
  it('rifiuta argomenti non validi', () => {
    expect(() => parseApifyArgs([])).toThrow(/--city/);
    expect(() => parseApifyArgs(['--city', 'A B'])).toThrow(/città/);
    expect(() => parseApifyArgs(['--city', 'milano', '--limit', '0'])).toThrow(/--limit/);
    expect(() => parseApifyArgs(['--city', 'milano', '--x'])).toThrow(/--x/);
  });
});

describe('env e interruttore', () => {
  it('isEnabled vale solo con "true"', () => {
    expect(isEnabled({ TYPICAL_APIFY_ENABLED: 'true' })).toBe(true);
    expect(isEnabled({ TYPICAL_APIFY_ENABLED: 'false' })).toBe(false);
    expect(isEnabled({})).toBe(false);
  });
  it('readApifyEnv richiede il token e ha l’attore di default', () => {
    expect(() => readApifyEnv({})).toThrow(/APIFY_TOKEN/);
    expect(readApifyEnv({ APIFY_TOKEN: ' t ' })).toEqual({
      token: 't',
      actorId: 'compass~crawler-google-places',
    });
    expect(readApifyEnv({ APIFY_TOKEN: 't', APIFY_ACTOR_ID: 'a/b' }).actorId).toBe('a~b');
  });
});

describe('utilità', () => {
  it('chunk spezza in lotti', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
  it('filterPlaceIds esclude demo-, spot: e vuoti', () => {
    expect(filterPlaceIds(['ChIJa', 'demo-01', 'spot:x', '', null])).toEqual(['ChIJa']);
  });
  it('summarize conta copertura, livelli e costo stimato', () => {
    const s = summarize(4, [
      { google_place_id: 'a', weekday: 1, hour: 1, level: 3 },
      { google_place_id: 'a', weekday: 1, hour: 2, level: 0 },
      { google_place_id: 'b', weekday: 1, hour: 1, level: 3 },
    ]);
    expect(s).toMatchObject({ requested: 4, withData: 2, withoutData: 2, rows: 3 });
    expect(s.levels).toEqual({ 0: 1, 1: 0, 2: 0, 3: 2 });
    expect(s.estimatedCostUsd).toBeGreaterThan(0);
  });
});

describe('run', () => {
  const base = { argv: ['--city', 'milano'], sleep: noSleep, log: () => {} };

  it('con il flag disabilitato non fa nessuna chiamata', async () => {
    const { fetchFn, calls } = makeFetch();
    const result = await run({ ...base, env: { ...env, TYPICAL_APIFY_ENABLED: 'false' }, fetchFn });
    expect(result).toEqual({ skipped: true });
    expect(calls).toEqual([]);
  });

  it('con il flag disabilitato non richiede nemmeno le credenziali', async () => {
    const { fetchFn, calls } = makeFetch();
    await expect(run({ ...base, env: {}, fetchFn })).resolves.toEqual({ skipped: true });
    expect(calls).toEqual([]);
  });

  it('legge i venue attivi della città e chiama Apify a lotti di 50 rispettando --limit', async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `ChIJ${i}`);
    const { fetchFn, calls } = makeFetch({ placeIds: ids });
    await run({ ...base, argv: ['--city', 'milano', '--dry-run', '--limit', '120'], env, fetchFn });
    const venues = calls.find((c) => c.url.includes('/rest/v1/venues'));
    expect(venues.url).toContain('limit=120');
    expect(venues.url).toMatch(/is_active=eq\.true/);
    const apifyCalls = calls.filter((c) => c.url.includes('api.apify.com'));
    expect(apifyCalls.map((c) => JSON.parse(c.init.body).placeIds.length)).toEqual([50, 50, 20]);
    expect(apifyCalls[0].url).toContain(
      '/v2/acts/compass~crawler-google-places/run-sync-get-dataset-items',
    );
  });

  it('non mette il token nell’URL ma nell’header Authorization', async () => {
    const { fetchFn, calls } = makeFetch({ placeIds: ['ChIJa'] });
    await run({ ...base, argv: ['--city', 'milano', '--dry-run'], env, fetchFn });
    const apify = calls.find((c) => c.url.includes('api.apify.com'));
    expect(apify.url).not.toContain(TOKEN);
    expect(apify.init.headers.Authorization).toBe(`Bearer ${TOKEN}`);
  });

  it('--dry-run non scrive nulla e stampa copertura, livelli e costo', async () => {
    const { fetchFn, calls } = makeFetch({
      placeIds: ['ChIJa', 'ChIJb'],
      apify: () => json([{ placeId: 'ChIJa', popularTimesHistogram: histogram }]),
    });
    const lines = [];
    const result = await run({
      ...base,
      argv: ['--city', 'milano', '--dry-run'],
      env,
      fetchFn,
      log: (l) => lines.push(l),
    });
    expect(calls.some((c) => c.url.includes('/rpc/'))).toBe(false);
    expect(result.summary).toMatchObject({ requested: 2, withData: 1, withoutData: 1 });
    expect(lines.join('\n')).toMatch(/1\/2/);
    expect(lines.join('\n')).toMatch(/\$/);
  });

  it('senza dry-run importa solo weekday/hour/level via RPC service_role', async () => {
    const { fetchFn, calls } = makeFetch({
      placeIds: ['ChIJa'],
      apify: () =>
        json([
          {
            placeId: 'ChIJa',
            title: 'Club Segreto',
            reviews: [{ text: 'bellissimo' }],
            phone: '+39 02 1234',
            popularTimesLiveText: 'Più affollato del solito',
            popularTimesLivePercent: 88,
            popularTimesHistogram: histogram,
          },
        ]),
    });
    await run({ ...base, env, fetchFn });
    const rpc = calls.find((c) => c.url.includes('/rpc/import_typical_apify'));
    expect(rpc.url).toBe('https://x.supabase.co/rest/v1/rpc/import_typical_apify');
    expect(rpc.init.headers.Authorization).toBe('Bearer srv-key');
    const body = JSON.parse(rpc.init.body);
    expect(body).toEqual({
      p_city_slug: 'milano',
      p_rows: [{ google_place_id: 'ChIJa', weekday: 6, hour: 23, level: 3 }],
    });
    expect(rpc.init.body).not.toMatch(/Segreto|bellissimo|1234|affollato|88|live/i);
  });

  it('scarta le righe di place che non abbiamo chiesto', async () => {
    const { fetchFn, calls } = makeFetch({
      placeIds: ['ChIJa'],
      apify: () => json([{ placeId: 'ChIJx', popularTimesHistogram: histogram }]),
    });
    await run({ ...base, env, fetchFn });
    expect(calls.some((c) => c.url.includes('/rpc/'))).toBe(false);
  });

  it('un output inatteso viene scartato senza scrivere', async () => {
    const { fetchFn, calls } = makeFetch({
      placeIds: ['ChIJa'],
      apify: () => json({ error: 'boom' }),
    });
    await expect(run({ ...base, env, fetchFn })).rejects.toThrow(/inatteso/);
    expect(calls.some((c) => c.url.includes('/rpc/'))).toBe(false);
  });

  it('ritenta su 5xx un numero limitato di volte e poi fallisce senza il token nel messaggio', async () => {
    let attempts = 0;
    const { fetchFn } = makeFetch({
      placeIds: ['ChIJa'],
      apify: () => {
        attempts += 1;
        return json({ error: { message: `token ${TOKEN}` } }, 503);
      },
    });
    const error = await run({ ...base, env, fetchFn }).catch((e) => e);
    expect(error.message).toMatch(/503/);
    expect(error.message).not.toContain(TOKEN);
    expect(attempts).toBe(3);
  });

  it('non ritenta su 4xx', async () => {
    let attempts = 0;
    const { fetchFn } = makeFetch({
      placeIds: ['ChIJa'],
      apify: () => {
        attempts += 1;
        return json({}, 401);
      },
    });
    await expect(run({ ...base, env, fetchFn })).rejects.toThrow(/401/);
    expect(attempts).toBe(1);
  });

  it('riesce dopo un errore transitorio', async () => {
    const { fetchFn } = makeFetch({
      placeIds: ['ChIJa'],
      apify: (n) =>
        n < 4 ? json({}, 502) : json([{ placeId: 'ChIJa', popularTimesHistogram: histogram }]),
    });
    const result = await run({ ...base, env, fetchFn });
    expect(result.summary.rows).toBe(1);
  });

  it('non logga mai il token né i dati dell’attore', async () => {
    const { fetchFn } = makeFetch({
      placeIds: ['ChIJa'],
      apify: () =>
        json([{ placeId: 'ChIJa', title: 'Club Segreto', popularTimesHistogram: histogram }]),
    });
    const lines = [];
    await run({ ...base, env, fetchFn, log: (l) => lines.push(String(l)) });
    expect(lines.join('\n')).not.toMatch(new RegExp(`${TOKEN}|Segreto|srv-key`));
  });

  it('il rifiuto della RPC è un errore esplicito', async () => {
    const { fetchFn } = makeFetch({
      placeIds: ['ChIJa'],
      apify: () => json([{ placeId: 'ChIJa', popularTimesHistogram: histogram }]),
      rpc: () => json({ message: 'INVALID_ARGUMENT' }, 400),
    });
    await expect(run({ ...base, env, fetchFn })).rejects.toThrow(/INVALID_ARGUMENT/);
  });

  it('senza venue da interrogare non chiama Apify', async () => {
    const { fetchFn, calls } = makeFetch({ placeIds: ['demo-01', 'spot:x'] });
    await run({ ...base, env, fetchFn });
    expect(calls.some((c) => c.url.includes('api.apify.com'))).toBe(false);
  });
});

describe('foto di copertina (flag separato VENUE_PHOTOS_APIFY_ENABLED)', () => {
  const photoUrl = 'https://lh3.googleusercontent.com/p/AF1Qip=w800';
  const item = {
    placeId: 'ChIJa',
    imageUrl: photoUrl,
    imageUrls: ['https://lh3.googleusercontent.com/p/ALTRA'],
    reviews: [{ reviewerPhotoUrl: 'https://lh3.googleusercontent.com/a/PERSONA' }],
    popularTimesHistogram: histogram,
  };
  const base = { argv: ['--city', 'milano'], sleep: noSleep, log: () => {} };
  const withPhotos = { ...env, VENUE_PHOTOS_APIFY_ENABLED: 'true' };
  const photoCall = (calls) => calls.find((c) => c.url.includes('/rpc/import_venue_photos_apify'));

  it('isPhotosEnabled vale solo con "true" e di default è spento', () => {
    expect(isPhotosEnabled({})).toBe(false);
    expect(isPhotosEnabled({ VENUE_PHOTOS_APIFY_ENABLED: 'false' })).toBe(false);
    expect(isPhotosEnabled({ VENUE_PHOTOS_APIFY_ENABLED: 'true' })).toBe(true);
  });

  it('con il flag acceso scrive solo imageUrl, mai imageUrls né foto delle recensioni', async () => {
    const { fetchFn, calls } = makeFetch({ placeIds: ['ChIJa'], apify: () => json([item]) });
    await run({ ...base, env: withPhotos, fetchFn });
    const rpc = photoCall(calls);
    expect(rpc.init.headers.Authorization).toBe('Bearer srv-key');
    expect(JSON.parse(rpc.init.body)).toEqual({
      p_city_slug: 'milano',
      p_rows: [{ google_place_id: 'ChIJa', image_url: photoUrl }],
    });
    expect(rpc.init.body).not.toMatch(/ALTRA|PERSONA/);
  });

  it('con il flag spento non scrive nessuna foto (nemmeno le legge)', async () => {
    const { fetchFn, calls } = makeFetch({ placeIds: ['ChIJa'], apify: () => json([item]) });
    const result = await run({ ...base, env, fetchFn });
    expect(photoCall(calls)).toBeUndefined();
    expect(result.summary.photos).toBeUndefined();
  });

  it('scarta URL non https o fuori da googleusercontent.com', async () => {
    const bad = ['http://lh3.googleusercontent.com/x', 'https://evil.example.com/x', 'boh', 7];
    for (const imageUrl of bad) {
      const { fetchFn, calls } = makeFetch({
        placeIds: ['ChIJa'],
        apify: () => json([{ placeId: 'ChIJa', imageUrl, popularTimesHistogram: histogram }]),
      });
      await run({ ...base, env: withPhotos, fetchFn });
      expect(photoCall(calls)).toBeUndefined();
    }
  });

  it('--dry-run conta le foto trovate senza scrivere', async () => {
    const { fetchFn, calls } = makeFetch({
      placeIds: ['ChIJa', 'ChIJb'],
      apify: () => json([item, { placeId: 'ChIJb', popularTimesHistogram: histogram }]),
    });
    const lines = [];
    const result = await run({
      ...base,
      argv: ['--city', 'milano', '--dry-run'],
      env: withPhotos,
      fetchFn,
      log: (l) => lines.push(l),
    });
    expect(calls.some((c) => c.url.includes('/rpc/'))).toBe(false);
    expect(result.summary.photos).toBe(1);
    expect(lines.join('\n')).toMatch(/Foto di copertina: 1\/2/);
    expect(lines.join('\n')).not.toContain('googleusercontent');
  });

  it('un place senza Popular times ma con foto scrive comunque la foto', async () => {
    const { fetchFn, calls } = makeFetch({
      placeIds: ['ChIJa'],
      apify: () => json([{ placeId: 'ChIJa', imageUrl: photoUrl }]),
    });
    await run({ ...base, env: withPhotos, fetchFn });
    expect(photoCall(calls)).toBeDefined();
    expect(calls.some((c) => c.url.includes('/rpc/import_typical_apify'))).toBe(false);
  });
});
