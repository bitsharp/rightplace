const SUPPORTED_COUNTRIES = ['IT', 'ES'];
const FALLBACK_COUNTRY = 'IT';

function supported(country: string | null): string | null {
  const code = country?.toUpperCase() ?? null;
  return code !== null && SUPPORTED_COUNTRIES.includes(code) ? code : null;
}

// Prefix for numbers saved without one: the phone's region wins, then the city being browsed.
export function resolveDefaultCountry(
  deviceRegion: string | null,
  cityCountry: string | null,
): string {
  return supported(deviceRegion) ?? supported(cityCountry) ?? FALLBACK_COUNTRY;
}
