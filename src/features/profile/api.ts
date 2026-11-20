import { z } from 'zod';

import type { Language } from '@/i18n/domain/pickLanguage';
import { callRpc } from '@/lib/callRpc';
import { RpcError, toRpcErrorCode } from '@/lib/rpcError';
import { supabase } from '@/lib/supabase';

export type Gender = 'female' | 'male' | 'other';

const profileRowSchema = z.object({
  id: z.string(),
  handle: z.string(),
  handle_changed_at: z.string().nullable(),
  handle_confirmed_at: z.string().nullable(),
  handle_free_change_used: z.boolean(),
  birth_date: z.string().nullable(),
  gender: z.enum(['female', 'male', 'other']).nullable(),
  locale: z.enum(['it', 'en']),
  location_opt_in: z.boolean(),
  contacts_opt_in: z.boolean(),
  is_creator: z.boolean(),
  deleted_at: z.string().nullable(),
  // embedded from profiles.city_id: the map city the user chose, own row only
  cities: z.object({ slug: z.string() }).nullable(),
});

const PROFILE_COLUMNS = Object.keys(profileRowSchema.shape)
  .map((column) => (column === 'cities' ? 'cities(slug)' : column))
  .join(', ');

export type MyProfile = {
  id: string;
  handle: string;
  handleChangedAt: string | null;
  // null = still in the onboarding @tag step: free changes, no 30-day limit yet
  handleConfirmedAt: string | null;
  // false = the one free change after onboarding (no 30-day wait) is still available
  handleFreeChangeUsed: boolean;
  birthDate: string | null;
  gender: Gender | null;
  locale: Language;
  locationOptIn: boolean;
  contactsOptIn: boolean;
  isCreator: boolean;
  // slug of profiles.city_id (the city the server uses for e.g. the feed digest); null = never set
  citySlug: string | null;
  deleted: boolean;
};

function toMyProfile(row: z.infer<typeof profileRowSchema>): MyProfile {
  return {
    id: row.id,
    handle: row.handle,
    handleChangedAt: row.handle_changed_at,
    handleConfirmedAt: row.handle_confirmed_at,
    handleFreeChangeUsed: row.handle_free_change_used,
    birthDate: row.birth_date,
    gender: row.gender,
    locale: row.locale,
    locationOptIn: row.location_opt_in,
    contactsOptIn: row.contacts_opt_in,
    isCreator: row.is_creator,
    citySlug: row.cities?.slug ?? null,
    deleted: row.deleted_at !== null,
  };
}

// Own row only: RLS on profiles never returns other people (they go through public_profiles).
export async function fetchMyProfile(userId: string): Promise<MyProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (error) throw new RpcError(toRpcErrorCode(error));
  return data ? toMyProfile(profileRowSchema.parse(data)) : null;
}

export type ProfileInput = {
  birthDate: string;
  gender: Gender;
  locale: Language;
  locationOptIn: boolean;
  contactsOptIn: boolean;
  isCreator: boolean;
};

// Launch city is Milano (CLAUDE.md); city choice arrives with multi-city.
export const DEFAULT_CITY_SLUG = 'milano';

// The map city also reaches the server (profiles.city_id): only a city slug, never a position.
export function setProfileCity(citySlug: string): Promise<void> {
  return callRpc('set_profile_city', { p_city_slug: citySlug });
}

export function completeProfile(input: ProfileInput): Promise<void> {
  return callRpc('complete_profile', {
    p_birth_date: input.birthDate,
    p_gender: input.gender,
    p_city_slug: DEFAULT_CITY_SLUG,
    p_locale: input.locale,
    p_location_opt_in: input.locationOptIn,
    p_contacts_opt_in: input.contactsOptIn,
    p_is_creator: input.isCreator,
  });
}

// profiles.locale drives push and AI; auth metadata drives Supabase Auth emails: keep both aligned.
export async function setLocale(locale: Language): Promise<void> {
  await callRpc('set_locale', { p_locale: locale });
  const { error } = await supabase.auth.updateUser({ data: { locale } });
  if (error) throw new RpcError(toRpcErrorCode(error));
}

export async function regenerateHandle(): Promise<string> {
  return z.string().parse(await callRpc('regenerate_handle'));
}

export async function setHandle(handle: string): Promise<string> {
  return z.string().parse(await callRpc('set_handle', { p_handle: handle }));
}

// Ends the free choice of the onboarding and starts the 30-day limit (idempotent on the server).
export function confirmHandle(): Promise<void> {
  return callRpc('confirm_handle');
}

const availabilitySchema = z.enum(['available', 'invalid', 'not_allowed', 'taken']);
export type HandleAvailability = z.infer<typeof availabilitySchema>;

export async function checkHandleAvailability(handle: string): Promise<HandleAvailability> {
  return availabilitySchema.parse(await callRpc('is_handle_available', { p_handle: handle }));
}

export function deleteMyAccount(): Promise<void> {
  return callRpc('delete_my_account');
}

export function updateCoarseLocation(lat: number, lng: number): Promise<void> {
  return callRpc('update_coarse_location', { p_lat: lat, p_lng: lng });
}
