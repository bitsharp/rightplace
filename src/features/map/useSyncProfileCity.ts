import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { useSession } from '@/features/auth/useSession';
import { CITY_TIMEZONE_KEY } from '@/features/notifications/hooks';
import { setProfileCity } from '@/features/profile/api';
import { myProfileKey } from '@/features/profile/hooks';

import { useCurrentCity } from './useCurrentCity';

// Mounted once (RootNavigator). Mirrors the city the app resolved onto profiles.city_id, because the
// server needs it too (feed digest at 12:00 in the city's time zone). Only a city slug leaves the
// device: never the position, not even the coarse cell.
export function useSyncProfileCity(enabled: boolean): void {
  const queryClient = useQueryClient();
  const { userId, profile } = useSession();
  const resolved = useCurrentCity();
  // The last city already sent for this user: a failure or a stale profile must not cause a burst of calls.
  const lastSent = useRef<string | null>(null);
  const profileCity = profile?.citySlug ?? null;
  const ready = enabled && profile !== null && userId !== null;

  useEffect(() => {
    if (!ready) return;
    const attempt = `${userId}:${resolved}`;
    if (resolved === profileCity) {
      lastSent.current = null;
      return;
    }
    if (lastSent.current === attempt) return;
    lastSent.current = attempt;
    setProfileCity(resolved)
      .then(() =>
        Promise.all([
          queryClient.invalidateQueries({ queryKey: myProfileKey(userId ?? undefined) }),
          queryClient.invalidateQueries({ queryKey: CITY_TIMEZONE_KEY }),
        ]),
      )
      .catch(() => console.warn('City sync failed'));
  }, [ready, userId, resolved, profileCity, queryClient]);
}
