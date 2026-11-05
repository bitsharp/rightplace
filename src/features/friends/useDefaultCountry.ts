import { getLocales } from 'expo-localization';

import { useMapStore } from '@/features/map/store/mapStore';
import { useActiveCities } from '@/features/venues/hooks';

import { resolveDefaultCountry } from './domain/defaultCountry';

export function useDefaultCountry(): string {
  const citySlug = useMapStore((state) => state.citySlug);
  const cities = useActiveCities();
  const cityCountry = cities.data?.find((city) => city.slug === citySlug)?.country ?? null;
  return resolveDefaultCountry(getLocales()[0]?.regionCode ?? null, cityCountry);
}
