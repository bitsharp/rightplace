import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { colors } from '@/theme/tokens';

import { FriendRow } from './FriendRow';

describe('FriendRow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra handle, fascia e dove va stasera', async () => {
    await render(
      <FriendRow
        handle="volpe.viola"
        meta="18–24 · Donna"
        venueLine="Arena Club"
        followState="following"
        onPressFollow={jest.fn()}
      />,
    );
    expect(screen.getByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText('Arena Club')).toBeOnTheScreen();
  });

  it('propone "Segui" in viola e vibra alla richiesta', async () => {
    const onPressFollow = jest.fn();
    await render(
      <FriendRow handle="gatto.blu" meta="m" followState="none" onPressFollow={onPressFollow} />,
    );
    const button = screen.getByRole('button', {
      name: 'ui:follow.a11yFollow({"handle":"@gatto.blu"})',
    });
    expect(button).toHaveStyle({ backgroundColor: colors.primary });
    await fireEvent.press(button);
    expect(onPressFollow).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });

  it('mostra "Richiesto" finché l’altro non accetta', async () => {
    await render(
      <FriendRow handle="gatto.blu" meta="m" followState="requested" onPressFollow={jest.fn()} />,
    );
    expect(screen.getByText('ui:follow.requested')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'ui:follow.a11yCancel({"handle":"@gatto.blu"})' }),
    ).toBeOnTheScreen();
  });

  it('mostra "Seguito" a follow accettato', async () => {
    await render(
      <FriendRow handle="gatto.blu" meta="m" followState="following" onPressFollow={jest.fn()} />,
    );
    expect(screen.getByText('ui:follow.following')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'ui:follow.a11yUnfollow({"handle":"@gatto.blu"})' }),
    ).toBeSelected();
  });
});
