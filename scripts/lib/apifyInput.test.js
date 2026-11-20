const {
  DEFAULT_ACTOR_ID,
  buildActorInput,
  buildStartUrlsInput,
  extractPlaces,
  normalizeActorId,
} = require('./apifyInput');

describe('buildActorInput', () => {
  it('passa i place ID in placeIds', () => {
    expect(buildActorInput(['a', 'b']).placeIds).toEqual(['a', 'b']);
  });

  it('chiede il minimo: niente recensioni, immagini, contatti né dati personali', () => {
    const input = buildActorInput(['a']);
    expect(input).toMatchObject({
      maxReviews: 0,
      maxImages: 0,
      scrapeReviewsPersonalData: false,
      scrapeImageAuthors: false,
      scrapeContacts: false,
      maxQuestions: 0,
    });
  });

  it('l’alternativa startUrls usa l’URL place_id', () => {
    expect(buildStartUrlsInput(['a']).startUrls).toEqual([
      { url: 'https://www.google.com/maps/place/?q=place_id:a' },
    ]);
  });
});

describe('normalizeActorId', () => {
  it('ha come default compass~crawler-google-places', () => {
    expect(DEFAULT_ACTOR_ID).toBe('compass~crawler-google-places');
  });
  it('converte user/actor in user~actor e rifiuta ID strani', () => {
    expect(normalizeActorId('compass/crawler-google-places')).toBe('compass~crawler-google-places');
    expect(() => normalizeActorId('../x?token=1')).toThrow(/APIFY_ACTOR_ID/);
  });
});

describe('extractPlaces', () => {
  it('associa placeId e popularTimesHistogram, ignorando ogni altro campo', () => {
    const places = extractPlaces([
      {
        placeId: 'ChIJa',
        popularTimesHistogram: { Su: [{ hour: 1, occupancyPercent: 5 }] },
        popularTimesLiveText: 'live',
        popularTimesLivePercent: 70,
        title: 'Nome',
        reviews: [{ text: 'x' }],
      },
    ]);
    expect(places).toEqual([
      { placeId: 'ChIJa', popularTimes: { Su: [{ hour: 1, occupancyPercent: 5 }] } },
    ]);
    expect(JSON.stringify(places)).not.toMatch(/live|Nome|reviews/);
  });

  it('come fallback legge popular_times (formato array per giorno)', () => {
    const [place] = extractPlaces([
      { placeId: 'a', popular_times: [{ day: 'Mo', popular_times: [] }] },
    ]);
    expect(place.popularTimes).toEqual([{ day: 'Mo', popular_times: [] }]);
  });

  it('legge solo imageUrl come foto: mai imageUrls né le foto delle recensioni', () => {
    const [place] = extractPlaces([
      {
        placeId: 'ChIJa',
        imageUrl: 'https://lh3.googleusercontent.com/p/a',
        imageUrls: ['https://lh3.googleusercontent.com/p/b'],
        reviews: [{ reviewerPhotoUrl: 'https://lh3.googleusercontent.com/a/c' }],
      },
    ]);
    expect(place.imageUrl).toBe('https://lh3.googleusercontent.com/p/a');
    expect(JSON.stringify(place)).not.toMatch(/p\/b|a\/c/);
  });

  it('senza imageUrl o con un valore non stringa la foto è assente', () => {
    expect(extractPlaces([{ placeId: 'a' }])[0].imageUrl).toBeUndefined();
    expect(extractPlaces([{ placeId: 'a', imageUrl: 5 }])[0].imageUrl).toBeUndefined();
  });

  it('non scarica altre immagini: maxImages resta 0', () => {
    expect(buildActorInput(['a']).maxImages).toBe(0);
  });

  it('scarta elementi inattesi o senza placeId', () => {
    expect(extractPlaces([null, 3, 'x', {}, { placeId: 7 }, { title: 'x' }])).toEqual([]);
  });

  it('non è un array → null', () => {
    expect(extractPlaces({ error: 'boom' })).toBeNull();
  });
});
