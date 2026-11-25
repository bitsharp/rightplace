import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { FollowersSection } from './FollowersSection';

jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('../avatar/hooks', () => ({ useAvatarUrls: () => new Map() }));
jest.mock('@/features/friends/hooks', () => ({
  useFollowers: () => ({
    data: [
      {
        userId: 'u1',
        handle: 'francesco.reale',
        ageBand: '18-24',
        gender: 'male',
        isCreator: false,
      },
    ],
  }),
  useRemoveFollower: () => ({ mutate: jest.fn() }),
}));

describe('FollowersSection', () => {
  it('handle e fascia restano su una riga e il blocco testo si restringe accanto a Rimuovi', async () => {
    await render(<FollowersSection />);
    const handle = screen.getByText('@francesco.reale');
    expect(handle.props.numberOfLines).toBe(1);
    expect(handle.props.ellipsizeMode).toBe('tail');
    expect(StyleSheet.flatten(handle.parent?.props.style)).toMatchObject({ flex: 1, minWidth: 0 });
    expect(screen.getByRole('button', { name: /followers.a11yRemove/ })).toBeTruthy();
  });
});
