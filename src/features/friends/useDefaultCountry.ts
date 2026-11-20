import { getLocales } from 'expo-localization';

import { useCurrentCity } from '@/features/map/useCurrentCity';
import { useActiveCities } from '@/features/venues/hooks';

import { resolveDefaultCountry } from './domain/defaultCountry';

export function useDefaultCountry(): string {
  const citySlug = useCurrentCity();
  const cities = useActiveCities();
  const cityCountry = cities.data?.find((city) => city.slug === citySlug)?.country ?? null;
  return resolveDefaultCountry(getLocales()[0]?.regionCode ?? null, cityCountry);
}
