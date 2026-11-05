import { render, screen } from '@testing-library/react-native';

import type { VenueFriend } from '../api';
import { FriendsGoing } from './FriendsGoing';

const friends: VenueFriend[] = [
  { handle: 'volpe.viola', ageBand: '18-24', gender: 'female', intent: 'going' },
  { handle: 'orso.grigio', ageBand: '25-34', gender: 'male', intent: 'maybe' },
];

describe('FriendsGoing', () => {
  it('elenca handle, fascia d’età e genere, e lo stato di ciascun amico', async () => {
    await render(<FriendsGoing friends={friends} />);
    expect(screen.getByText('@volpe.viola')).toBeOnTheScreen();
    expect(
      screen.getByText('venue:friends.meta({"age":"18–24","gender":"venue:gender.female"})'),
    ).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.goingAction')).toBeOnTheScreen();
    expect(screen.getByText('@orso.grigio')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.maybeAction')).toBeOnTheScreen();
  });

  it('mostra il numero di amici', async () => {
    await render(<FriendsGoing friends={friends} />);
    expect(screen.getByText('ui:friendsGoing({"count":2})')).toBeOnTheScreen();
  });

  it('senza amici mostra il messaggio e nessun bottone segui', async () => {
    await render(<FriendsGoing friends={[]} />);
    expect(screen.getByText('venue:friends.empty')).toBeOnTheScreen();
    expect(screen.queryByText('ui:follow.follow')).toBeNull();
  });

  it('non offre mai di seguire: sono già amici accettati', async () => {
    await render(<FriendsGoing friends={friends} />);
    expect(screen.queryByText('ui:follow.follow')).toBeNull();
    expect(screen.queryByText('ui:follow.following')).toBeNull();
  });
});
