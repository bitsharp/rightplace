import { render, screen } from '@testing-library/react-native';

import { FriendFaces } from './FriendFaces';

const friends = [
  { userId: 'u-volpe', handle: 'volpe.viola' },
  { userId: 'u-orso', handle: 'orso.grigio' },
  { userId: 'u-gatto', handle: 'gatto.blu' },
];

describe('FriendFaces', () => {
  it('mostra al massimo due volti e “+N” per gli altri', async () => {
    await render(<FriendFaces friends={friends} urls={{}} />);
    expect(screen.getAllByTestId('avatar', { includeHiddenElements: true })).toHaveLength(2);
    expect(screen.getByText('+1')).toBeOnTheScreen();
  });

  it('usa la foto firmata per chi è visibile e l’iniziale per gli altri', async () => {
    await render(<FriendFaces friends={friends.slice(0, 2)} urls={{ 'u-volpe': 'https://x/v' }} />);
    expect(screen.getAllByTestId('avatar-image', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByText('O', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('senza amici non disegna nulla', async () => {
    await render(<FriendFaces friends={[]} urls={{}} />);
    expect(screen.queryByTestId('friend-faces')).toBeNull();
  });
});
