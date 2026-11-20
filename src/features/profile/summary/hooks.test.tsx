import { renderHook, waitFor } from '@testing-library/react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { useProfileSummary } from './hooks';
import { profileSummaryKey } from './keys';

describe('useProfileSummary', () => {
  it('legge il riepilogo e non lo salva su disco', async () => {
    setFakeRpc({
      get_profile_summary: [
        {
          handle: 'volpe.viola',
          age_band: '25-34',
          gender: 'female',
          is_creator: false,
          followers_count: null,
          following_count: null,
          posts_count: null,
          is_me: false,
          follow_state: 'pending',
        },
      ],
    });
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(() => useProfileSummary('u1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data?.followState).toBe('pending'));
    expect(client.getQueryCache().find({ queryKey: profileSummaryKey('u1') })?.meta).toEqual({
      persist: false,
    });
  });

  it('senza id non chiede nulla', async () => {
    const { Wrapper } = createQueryWrapper();
    await renderHook(() => useProfileSummary(undefined), { wrapper: Wrapper });
    expect(fakeSupabase.rpc).not.toHaveBeenCalledWith('get_profile_summary', expect.anything());
  });
});
