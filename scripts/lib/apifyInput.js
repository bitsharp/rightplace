// The ONLY module that knows the Apify actor's schema (input and output). Changing actor = editing this file.
// Current actor: compass/crawler-google-places ("Google Maps Scraper"), addressed as compass~crawler-google-places.
// To adapt another actor: change buildActorInput (what it wants as input) and extractPlaces (which output
// fields carry the place ID and the Popular-times histogram). Everything else is ignored by design.

const DEFAULT_ACTOR_ID = 'compass~crawler-google-places';
const ACTOR_ID = /^[A-Za-z0-9_.-]+[~/][A-Za-z0-9_.-]+$/;

function normalizeActorId(value) {
  if (!ACTOR_ID.test(value)) {
    throw new Error(
      'APIFY_ACTOR_ID non valido: atteso "utente~attore" (es. compass~crawler-google-places).',
    );
  }
  return value.replace('/', '~');
}

// Options that keep the download minimal: no reviews, images, Q&A, contacts or personal data. VERIFY the
// field names against the actor's current input schema before the first real run.
const MINIMAL_OPTIONS = {
  language: 'en',
  maxReviews: 0,
  maxImages: 0,
  maxQuestions: 0,
  scrapeReviewsPersonalData: false,
  scrapeImageAuthors: false,
  scrapeContacts: false,
  scrapeSocialMediaProfiles: {
    facebooks: false,
    instagrams: false,
    youtubes: false,
    tiktoks: false,
    twitters: false,
  },
  includeWebResults: false,
  scrapeDirectories: false,
  scrapeTableReservationProvider: false,
};

// Preferred: the actor's direct search by place ID.
function buildActorInput(placeIds) {
  return { ...MINIMAL_OPTIONS, placeIds };
}

// Alternative if `placeIds` is not accepted: Google Maps URLs by place ID.
function buildStartUrlsInput(placeIds) {
  return {
    ...MINIMAL_OPTIONS,
    startUrls: placeIds.map((id) => ({
      url: `https://www.google.com/maps/place/?q=place_id:${id}`,
    })),
  };
}

// Output of one dataset item → only the place ID and the histogram. `popularTimesHistogram` is the actor's
// field ({ Su: [{hour, occupancyPercent}], Mo: [...] }); popular_times / popularTimes are tolerated fallbacks.
// popularTimesLiveText / popularTimesLivePercent and everything else are never read (principle 11).
function extractPlaces(items) {
  if (!Array.isArray(items)) return null;
  return items
    .filter((item) => item !== null && typeof item === 'object' && typeof item.placeId === 'string')
    .map((item) => ({
      placeId: item.placeId,
      popularTimes: item.popularTimesHistogram ?? item.popular_times ?? item.popularTimes,
    }));
}

module.exports = {
  DEFAULT_ACTOR_ID,
  buildActorInput,
  buildStartUrlsInput,
  extractPlaces,
  normalizeActorId,
};
