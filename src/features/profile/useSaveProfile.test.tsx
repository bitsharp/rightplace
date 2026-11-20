import { renderHook, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import { useAuthStore } from '@/features/auth/store/authStore';
import { useSession } from '@/features/auth/useSession';
import { useSyncProfileCity } from '@/features/map/useSyncProfileCity';
import { useCoarsePositionStore } from '@/features/profile/location';
import { fakeProfileRow, fakeSupabase, setFakeRpc, setFakeTable } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import type { ProfileInput } from './api';
import { useSaveProfile } from './useSaveProfile';

const INPUT: ProfileInput = {
  birthDate: '2000-05-10',
  gender: 'female',
  locale: 'it',
  locationOptIn: false,
  contactsOptIn: false,
  isCreator: false,
};

const callsOf = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([rpcName]) => rpcName === name).map(([, args]) => args);

async function renderSave(profileCity: string | null) {
  useCoarsePositionStore.setState({ cell: null });
  useAuthStore.setState({
    initialized: true,
    session: { userId: 'user-1', email: 'lince@example.com', emailConfirmed: true },
  });
  setFakeTable('profiles', [
    fakeProfileRow({ cities: profileCity ? { slug: profileCity } : null }),
  ]);
  setFakeRpc({
    get_active_cities: [
      {
        slug: 'las-palmas',
        name: 'Las Palmas',
        country: 'ES',
        lat: 28.1,
        lng: -15.4,
        default_zoom: 13,
      },
      { slug: 'milano', name: 'Milano', country: 'IT', lat: 45.46, lng: 9.19, default_zoom: 13 },
    ],
    complete_profile: (args: unknown) => {
      const slug = (args as { p_city_slug: string }).p_city_slug;
      setFakeTable('profiles', [fakeProfileRow({ cities: { slug } })]);
      return null;
    },
  });
  const { Wrapper } = createQueryWrapper();
  const view = await renderHook(
    () => {
      useSyncProfileCity(true);
      return { save: useSaveProfile(), session: useSession() };
    },
    { wrapper: Wrapper },
  );
  await waitFor(() => expect(view.result.current.session.profile).not.toBeNull());
  return view;
}

describe('useSaveProfile', () => {
  beforeEach(() => jest.spyOn(console, 'warn').mockImplementation(() => undefined));

  it('salvando il profilo mantiene la città già salvata e non richiama set_profile_city', async () => {
    const { result } = await renderSave('las-palmas');
    await act(async () => {
      expect(await result.current.save(INPUT)).toBeNull();
    });
    expect(callsOf('complete_profile')).toEqual([
      expect.objectContaining({ p_city_slug: 'las-palmas' }),
    ]);
    await act(async () => undefined);
    expect(callsOf('set_profile_city')).toEqual([]);
  });

  it("all'onboarding di un utente nuovo, senza città né posizione, usa quella di default", async () => {
    const { result } = await renderSave(null);
    await act(async () => {
      expect(await result.current.save(INPUT)).toBeNull();
    });
    expect(callsOf('complete_profile')).toEqual([
      expect.objectContaining({ p_city_slug: 'milano' }),
    ]);
  });
});
