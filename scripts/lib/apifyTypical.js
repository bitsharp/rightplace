// Pure domain of the Apify "di solito" import (roadmap 21, CLAUDE.md principle 11).
// Minimisation: from the actor's Popular-times histogram we keep ONLY weekday/hour/level. Anything else
// (live crowd, names, reviews, ...) is never read, so it can never be stored or logged.

// Google score (0-100) → our level. Thresholds are the upper bounds (inclusive) of levels 1 and 2.
const LEVEL_1_MAX_SCORE = 33;
const LEVEL_2_MAX_SCORE = 66;

// 0 = Sunday, like venue_typical_busyness.weekday. Day names as the common actors emit them.
const DAY_INDEX = {
  su: 0,
  sun: 0,
  sunday: 0,
  mo: 1,
  mon: 1,
  monday: 1,
  tu: 2,
  tue: 2,
  tuesday: 2,
  we: 3,
  wed: 3,
  wednesday: 3,
  th: 4,
  thu: 4,
  thursday: 4,
  fr: 5,
  fri: 5,
  friday: 5,
  sa: 6,
  sat: 6,
  saturday: 6,
};

function toLevel(score) {
  if (typeof score !== 'number' || !(score > 0)) return 0;
  if (score <= LEVEL_1_MAX_SCORE) return 1;
  return score <= LEVEL_2_MAX_SCORE ? 2 : 3;
}

function weekdayOf(dayName) {
  return typeof dayName === 'string' ? DAY_INDEX[dayName.trim().toLowerCase()] : undefined;
}

// Field names for the score differ between actors: take the first numeric one, never anything else.
function scoreOf(cell) {
  return [cell.occupancyPercent, cell.percentage, cell.score].find((v) => typeof v === 'number');
}

function cellsToRows(placeId, weekday, cells) {
  if (!Array.isArray(cells)) return [];
  return cells
    .filter((cell) => cell !== null && typeof cell === 'object')
    .filter((cell) => Number.isInteger(cell.hour) && cell.hour >= 0 && cell.hour <= 23)
    .map((cell) => ({
      google_place_id: placeId,
      weekday,
      hour: cell.hour,
      level: toLevel(scoreOf(cell)),
    }));
}

// Both known shapes become [[dayName, cells]] pairs.
function dayEntries(popularTimes) {
  if (Array.isArray(popularTimes)) {
    return popularTimes
      .filter((entry) => entry !== null && typeof entry === 'object')
      .map((entry) => [entry.day, entry.popular_times]);
  }
  if (popularTimes !== null && typeof popularTimes === 'object')
    return Object.entries(popularTimes);
  return [];
}

function histogramToRows(placeId, popularTimes) {
  const cells = new Map();
  for (const [dayName, hours] of dayEntries(popularTimes)) {
    const weekday = weekdayOf(dayName);
    if (weekday === undefined) continue;
    for (const row of cellsToRows(placeId, weekday, hours)) {
      cells.set(`${row.weekday}|${row.hour}`, row);
    }
  }
  return [...cells.values()];
}

// Cover photo (accepted risk, CLAUDE.md principle 11 exception): only the https URL of the actor's main `imageUrl`
// on googleusercontent.com survives. Same rule as import_venue_photos_apify, checked here too so nothing else is sent.
const PHOTO_HOST = 'googleusercontent.com';

function toPhotoRow(placeId, imageUrl) {
  if (typeof imageUrl !== 'string') return null;
  let url;
  try {
    url = new URL(imageUrl);
  } catch {
    return null;
  }
  const hostOk = url.hostname === PHOTO_HOST || url.hostname.endsWith(`.${PHOTO_HOST}`);
  if (url.protocol !== 'https:' || !hostOk || url.username !== '' || url.password !== '')
    return null;
  return { google_place_id: placeId, image_url: imageUrl };
}

module.exports = {
  DAY_INDEX,
  LEVEL_1_MAX_SCORE,
  LEVEL_2_MAX_SCORE,
  histogramToRows,
  toLevel,
  toPhotoRow,
};
