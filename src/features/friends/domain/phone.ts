// No phone library on purpose (CLAUDE.md: no new dependencies): only the countries we launch in are
// validated strictly, everything else must arrive with an explicit international prefix.
const CALLING_CODES: Record<string, string> = { IT: '39', ES: '34' };

const NATIONAL_PATTERNS: Record<string, RegExp> = {
  // Italian mobiles are 3xx (9-10 digits); landlines keep their leading 0 (6-11 digits).
  '39': /^(3\d{8,9}|0\d{5,10})$/,
  '34': /^[6-9]\d{8}$/,
};

const MIN_DIGITS = 8;
const MAX_DIGITS = 15;

function internationalDigits(raw: string, defaultCountry: string): string | null {
  const cleaned = raw
    .trim()
    .replace(/^tel:/i, '')
    .replace(/[\s\-.()]/g, '');
  if (!/^\+?\d+$/.test(cleaned)) return null;
  if (cleaned.startsWith('+')) return cleaned.slice(1);
  if (cleaned.startsWith('00')) return cleaned.slice(2);
  const callingCode = CALLING_CODES[defaultCountry];
  return callingCode ? callingCode + cleaned : null;
}

function isPlausible(digits: string): boolean {
  if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS || digits.startsWith('0')) {
    return false;
  }
  const callingCode = Object.values(CALLING_CODES).find((code) => digits.startsWith(code));
  if (!callingCode) return true;
  return NATIONAL_PATTERNS[callingCode]?.test(digits.slice(callingCode.length)) ?? false;
}

export function toE164(raw: string, defaultCountry: string): string | null {
  const digits = internationalDigits(raw, defaultCountry);
  return digits !== null && isPlausible(digits) ? `+${digits}` : null;
}
