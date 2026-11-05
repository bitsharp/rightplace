import { fireEvent, render, screen } from '@testing-library/react-native';
import { Alert } from 'react-native';

import { avatarIntent } from '@/features/friends/domain/avatarColor';
import { colors } from '@/theme/tokens';

import { FriendRow } from './FriendRow';

const AVATAR_BORDER = {
  going: colors.going,
  maybe: colors.maybe,
  neutral: colors.border,
};

describe('FriendRow', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra handle, fascia e dove va stasera quando il follow è accettato', async () => {
    await render(
      <FriendRow
        handle="volpe.viola"
        meta="18–24 · Donna"
        venueLine="Stasera: Arena Club"
        followState="accepted"
        onAction={jest.fn()}
      />,
    );
    expect(screen.getByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText('18–24 · Donna')).toBeOnTheScreen();
    expect(screen.getByText('Stasera: Arena Club')).toBeOnTheScreen();
  });

  it.each(['none', 'pending'] as const)(
    'non mostra mai il locale di stasera se il follow è %s',
    async (followState) => {
      await render(
        <FriendRow
          handle="volpe.viola"
          meta="m"
          venueLine="Stasera: Arena Club"
          followState={followState}
          onAction={jest.fn()}
        />,
      );
      expect(screen.queryByText('Stasera: Arena Club')).not.toBeOnTheScreen();
    },
  );

  it('l’avatar ha l’iniziale e il colore ricavato dall’handle', async () => {
    await render(
      <FriendRow handle="volpe.viola" meta="m" followState="none" onAction={jest.fn()} />,
    );
    expect(screen.getByText('V', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId('avatar', { includeHiddenElements: true })).toHaveStyle({
      borderColor: AVATAR_BORDER[avatarIntent('volpe.viola')],
    });
  });

  it('propone "Richiedi" in viola e chiede di seguire', async () => {
    const onAction = jest.fn();
    await render(<FriendRow handle="gatto.blu" meta="m" followState="none" onAction={onAction} />);
    const button = screen.getByRole('button', {
      name: 'ui:follow.a11yRequest({"handle":"@gatto.blu"})',
    });
    expect(screen.getByText('ui:follow.request')).toBeOnTheScreen();
    expect(button).toHaveStyle({ backgroundColor: colors.primary });
    await fireEvent.press(button);
    expect(onAction).toHaveBeenCalledWith('request');
  });

  it('mostra "Richiesta inviata" finché l’altro non accetta e il tap la ritira', async () => {
    const onAction = jest.fn();
    await render(
      <FriendRow handle="gatto.blu" meta="m" followState="pending" onAction={onAction} />,
    );
    expect(screen.getByText('ui:follow.requested')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'ui:follow.a11yCancel({"handle":"@gatto.blu"})' }),
    );
    expect(onAction).toHaveBeenCalledWith('cancel');
  });

  it('con follow accettato mostra "Seguito" e smette di seguire solo dopo la conferma', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onAction = jest.fn();
    await render(
      <FriendRow handle="gatto.blu" meta="m" followState="accepted" onAction={onAction} />,
    );
    const button = screen.getByRole('button', {
      name: 'ui:follow.a11yUnfollow({"handle":"@gatto.blu"})',
    });
    expect(screen.getByText('ui:follow.following')).toBeOnTheScreen();
    expect(button).toBeSelected();
    await fireEvent.press(button);
    expect(onAction).not.toHaveBeenCalled();
    expect(alert).toHaveBeenCalledTimes(1);
    const buttons = alert.mock.calls[0]?.[2] ?? [];
    const confirm = buttons.find((item) => item.style === 'destructive');
    confirm?.onPress?.();
    expect(onAction).toHaveBeenCalledWith('unfollow');
  });

  it('annullando la conferma non smette di seguire', async () => {
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
    const onAction = jest.fn();
    await render(
      <FriendRow handle="gatto.blu" meta="m" followState="accepted" onAction={onAction} />,
    );
    await fireEvent.press(screen.getByText('ui:follow.following'));
    const cancel = (alert.mock.calls[0]?.[2] ?? []).find((item) => item.style === 'cancel');
    cancel?.onPress?.();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('mostra "Ti segue" se mi segue e io non ho ancora chiesto nulla', async () => {
    await render(
      <FriendRow handle="gatto.blu" meta="m" followState="none" followsMe onAction={jest.fn()} />,
    );
    expect(screen.getByText('ui:follow.followsYou')).toBeOnTheScreen();
  });

  it.each(['pending', 'accepted'] as const)(
    'non mostra "Ti segue" con follow %s',
    async (state) => {
      await render(
        <FriendRow
          handle="gatto.blu"
          meta="m"
          followState={state}
          followsMe
          onAction={jest.fn()}
        />,
      );
      expect(screen.queryByText('ui:follow.followsYou')).not.toBeOnTheScreen();
    },
  );

  it('il tap lungo sulla riga apre il menu (blocca / segnala)', async () => {
    const onLongPress = jest.fn();
    await render(
      <FriendRow
        handle="gatto.blu"
        meta="m"
        followState="none"
        onAction={jest.fn()}
        onLongPress={onLongPress}
      />,
    );
    await fireEvent(screen.getByTestId('friend-row'), 'longPress');
    expect(onLongPress).toHaveBeenCalled();
  });
});
