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

const renderHeader = (avatarPhoto?: { uri: string; cacheKey: string }) =>
  render(
    <PublicProfileHeader
      person={person}
      summary={null}
      avatarPhoto={avatarPhoto}
      onAction={jest.fn()}
      onMore={jest.fn()}
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
});
