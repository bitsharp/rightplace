import { fireEvent, render, screen } from '@testing-library/react-native';

import type { VenueFriend } from '../api';
import { FriendsGoing } from './FriendsGoing';

const friends: VenueFriend[] = [
  { userId: 'u-volpe', handle: 'volpe.viola', ageBand: '18-24', gender: 'female', intent: 'going' },
  { userId: 'u-orso', handle: 'orso.grigio', ageBand: '25-34', gender: 'male', intent: 'maybe' },
];

describe('FriendsGoing', () => {
  it('elenca handle, fascia d’età e genere, e lo stato di ciascun amico', async () => {
    await render(<FriendsGoing friends={friends} urls={{}} onSeeAll={jest.fn()} />);
    expect(screen.getByText('@volpe.viola')).toBeOnTheScreen();
    expect(
      screen.getByText('venue:friends.meta({"age":"18–24","gender":"venue:gender.female"})'),
    ).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.goingAction')).toBeOnTheScreen();
    expect(screen.getByText('@orso.grigio')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.maybeAction')).toBeOnTheScreen();
  });

  it('mostra il numero di amici', async () => {
    await render(<FriendsGoing friends={friends} urls={{}} onSeeAll={jest.fn()} />);
    expect(screen.getByText('ui:friendsGoing({"count":2})')).toBeOnTheScreen();
  });

  it('senza amici mostra il messaggio e nessun bottone segui', async () => {
    await render(<FriendsGoing friends={[]} urls={{}} onSeeAll={jest.fn()} />);
    expect(screen.getByText('venue:friends.empty')).toBeOnTheScreen();
    expect(screen.queryByText('ui:follow.follow')).toBeNull();
  });

  it('non offre mai di seguire: sono già amici accettati', async () => {
    await render(<FriendsGoing friends={friends} urls={{}} onSeeAll={jest.fn()} />);
    expect(screen.queryByText('ui:follow.follow')).toBeNull();
    expect(screen.queryByText('ui:follow.following')).toBeNull();
  });

  it('mostra la foto degli amici che la rendono visibile e l’iniziale degli altri', async () => {
    await render(
      <FriendsGoing
        friends={friends}
        urls={{ 'u-volpe': 'https://signed.test/a/v' }}
        onSeeAll={jest.fn()}
      />,
    );
    expect(screen.getAllByTestId('avatar-image', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByText('O', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('mostra i volti degli amici e "Vedi tutti" apre la lista amici', async () => {
    const onSeeAll = jest.fn();
    await render(<FriendsGoing friends={friends} urls={{}} onSeeAll={onSeeAll} />);
    expect(screen.getByTestId('friend-faces')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'venue:friends.seeAll' }));
    expect(onSeeAll).toHaveBeenCalledTimes(1);
  });

  it('senza amici non ci sono volti né "Vedi tutti"', async () => {
    await render(<FriendsGoing friends={[]} urls={{}} onSeeAll={jest.fn()} />);
    expect(screen.queryByTestId('friend-faces')).toBeNull();
    expect(screen.queryByText('venue:friends.seeAll')).toBeNull();
  });

  it('un amico senza id (RPC precedente) mostra comunque l’iniziale', async () => {
    const legacy: VenueFriend[] = [{ ...friends[0]!, userId: null }];
    await render(<FriendsGoing friends={legacy} urls={{}} onSeeAll={jest.fn()} />);
    expect(screen.getByTestId('friend-faces')).toBeOnTheScreen();
    expect(screen.queryByTestId('avatar-image', { includeHiddenElements: true })).toBeNull();
  });
});
