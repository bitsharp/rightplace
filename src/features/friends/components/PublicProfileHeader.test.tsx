import { StyleSheet } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import type { SearchResult } from '../api';
import { PublicProfileHeader } from './PublicProfileHeader';

const person: SearchResult = {
  userId: 'u1',
  handle: 'volpe.viola',
  ageBand: '25-34',
  gender: 'female',
  isCreator: false,
  followState: 'accepted',
  followsMe: false,
  tonightVenueId: null,
  tonightVenueName: null,
};

const onMore = jest.fn();
const renderHeader = (avatarPhoto?: { uri: string; cacheKey: string }, onMessage?: () => void) =>
  render(
    <PublicProfileHeader
      person={person}
      summary={null}
      avatarPhoto={avatarPhoto}
      onAction={jest.fn()}
      onMore={onMore}
      onMessage={onMessage}
    />,
  );

describe('PublicProfileHeader', () => {
  it('toccando la foto visibile la apre a schermo intero', async () => {
    await renderHeader({ uri: 'https://signed.test/u1', cacheKey: 'u1' });
    await fireEvent.press(screen.getByRole('button', { name: 'profile:avatar.enlarge' }));
    expect(screen.getByTestId('photo-viewer-list').props.data).toEqual([
      expect.objectContaining({ uri: 'https://signed.test/u1' }),
    ]);
  });

  it('con la sola iniziale non c’è nulla da ingrandire', async () => {
    await renderHeader();
    expect(screen.queryByRole('button', { name: 'profile:avatar.enlarge' })).toBeNull();
    expect(screen.queryByTestId('photo-viewer-list')).toBeNull();
  });

  it('segnala o blocca è un bottone icona quadrato con etichetta accessibile che apre l’azione', async () => {
    await renderHeader();
    const more = screen.getByRole('button', { name: 'friends:publicProfile.more' });
    expect(StyleSheet.flatten(more.props.style)).toMatchObject({ width: 44, height: 44 });
    await fireEvent.press(more);
    expect(onMore).toHaveBeenCalledTimes(1);
  });

  it('follow e Messaggio si dividono la riga e i label non vanno a capo', async () => {
    await renderHeader(undefined, jest.fn());
    const message = screen.getByText('dm:profile.message');
    expect(message.props.numberOfLines).toBe(1);
    expect(
      StyleSheet.flatten(screen.getByRole('button', { name: 'dm:profile.message' }).props.style),
    ).toMatchObject({ flex: 1 });
    expect(screen.getByText('ui:follow.following').props.numberOfLines).toBe(1);
  });
});
