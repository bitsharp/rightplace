import type { MyProfile } from '../api';
import { toProfileInput } from './profileInput';

const profile: MyProfile = {
  id: 'u1',
  handle: 'lince.rosso',
  handleChangedAt: null,
  handleConfirmedAt: '2026-01-01T00:00:00Z',
  handleFreeChangeUsed: false,
  birthDate: '2000-05-10',
  gender: 'female',
  locale: 'it',
  locationOptIn: true,
  contactsOptIn: false,
  isCreator: true,
  isSupport: false,
  citySlug: 'milano',
  deleted: false,
};

describe('toProfileInput', () => {
  it('riporta i campi che complete_profile riscrive tutti insieme', () => {
    expect(toProfileInput(profile)).toEqual({
      birthDate: '2000-05-10',
      gender: 'female',
      locale: 'it',
      locationOptIn: true,
      contactsOptIn: false,
      isCreator: true,
    });
  });

  it('senza data di nascita o genere non c’è nulla da salvare', () => {
    expect(toProfileInput({ ...profile, birthDate: null })).toBeNull();
    expect(toProfileInput({ ...profile, gender: null })).toBeNull();
  });
});
