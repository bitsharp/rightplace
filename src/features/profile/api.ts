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
  birth_date: z.string().nullable(),
  gender: z.enum(['female', 'male', 'other']).nullable(),
  locale: z.enum(['it', 'en']),
  location_opt_in: z.boolean(),
  contacts_opt_in: z.boolean(),
  is_creator: z.boolean(),
  deleted_at: z.string().nullable(),
});

const PROFILE_COLUMNS = Object.keys(profileRowSchema.shape).join(', ');

export type MyProfile = {
  id: string;
  handle: string;
  handleChangedAt: string | null;
  birthDate: string | null;
  gender: Gender | null;
  locale: Language;
  locationOptIn: boolean;
  contactsOptIn: boolean;
  isCreator: boolean;
  deleted: boolean;
};

function toMyProfile(row: z.infer<typeof profileRowSchema>): MyProfile {
  return {
    id: row.id,
    handle: row.handle,
    handleChangedAt: row.handle_changed_at,
    birthDate: row.birth_date,
    gender: row.gender,
    locale: row.locale,
    locationOptIn: row.location_opt_in,
    contactsOptIn: row.contacts_opt_in,
    isCreator: row.is_creator,
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

export function deleteMyAccount(): Promise<void> {
  return callRpc('delete_my_account');
}

export function updateCoarseLocation(lat: number, lng: number): Promise<void> {
  return callRpc('update_coarse_location', { p_lat: lat, p_lng: lng });
}
