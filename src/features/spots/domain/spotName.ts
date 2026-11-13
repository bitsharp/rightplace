export const SPOT_NAME_MIN = 3;
export const SPOT_NAME_MAX = 40;

export type SpotNameCheck = 'ok' | 'tooShort' | 'tooLong' | 'noMentions' | 'noLinks';

// Same regex as private.is_valid_spot_name in the database: the server stays the authority, this only
// lets the sheet explain the refusal before a round trip.
const LINK = /https?:\/\/|www\.|\.[a-z]{2,}(\/|$)/i;

export function validateSpotName(raw: string): SpotNameCheck {
  const name = raw.trim();
  // Code points, like Postgres char_length (an emoji is one character, two UTF-16 units).
  const length = [...name].length;
  if (length < SPOT_NAME_MIN) return 'tooShort';
  if (length > SPOT_NAME_MAX) return 'tooLong';
  if (name.includes('@')) return 'noMentions';
  if (LINK.test(name)) return 'noLinks';
  return 'ok';
}
