import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { BlockedSection } from './BlockedSection';

jest.mock('@/features/friends/hooks', () => ({
  useBlockedUsers: () => ({
    data: [
      {
        userId: 'u1',
        handle: 'luce.zuccherina.lunghissima',
        ageBand: '25-34',
        gender: 'female',
        isCreator: false,
      },
    ],
  }),
  useUnblockUser: () => ({ mutate: jest.fn() }),
}));

describe('BlockedSection', () => {
  it('l’handle lungo resta su una riga e non spinge fuori il bottone Sblocca', async () => {
    await render(<BlockedSection />);
    const handle = screen.getByText('@luce.zuccherina.lunghissima');
    expect(handle.props.numberOfLines).toBe(1);
    expect(handle.props.ellipsizeMode).toBe('tail');
    expect(StyleSheet.flatten(handle.props.style)).toMatchObject({ flex: 1, minWidth: 0 });
  });
});
