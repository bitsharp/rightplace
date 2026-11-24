import { useActiveCities } from '@/features/venues/hooks';

import { useCurrentCity } from './useCurrentCity';

// The display name of the map city (the profile header and the "Map city" settings row show it).
export function useCurrentCityName(): string | null {
  const slug = useCurrentCity();
  const cities = useActiveCities().data;
  return cities?.find((city) => city.slug === slug)?.name ?? null;
}
