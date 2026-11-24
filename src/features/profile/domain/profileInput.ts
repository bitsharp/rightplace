import type { MyProfile, ProfileInput } from '../api';

// complete_profile rewrites all these fields at once, so a single setting is saved by sending the
// current profile with one field changed. Null while the onboarding has not set age and gender.
export function toProfileInput(profile: MyProfile): ProfileInput | null {
  if (!profile.birthDate || !profile.gender) return null;
  return {
    birthDate: profile.birthDate,
    gender: profile.gender,
    locale: profile.locale,
    locationOptIn: profile.locationOptIn,
    contactsOptIn: profile.contactsOptIn,
    isCreator: profile.isCreator,
  };
}
