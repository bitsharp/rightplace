import { fireEvent, render, screen } from '@testing-library/react-native';

import { FriendVenueList } from './FriendVenueList';

describe('FriendVenueList', () => {
  const venues = [
    {
      venueId: 'v1',
      name: 'Arena Club',
      handles: ['volpe.viola', 'orso.grigio'],
      friendIds: ['u-volpe', 'u-orso'],
      count: 2,
    },
  ];

  it('elenca locale, numero di amici e i loro handle', async () => {
    await render(<FriendVenueList venues={venues} urls={{}} onOpen={jest.fn()} />);
    expect(
      screen.getByText('ui:friendsGoing({"count":2}) · @volpe.viola, @orso.grigio'),
    ).toBeOnTheScreen();
  });

  it('mostra la foto degli amici visibili e l’iniziale degli altri', async () => {
    await render(
      <FriendVenueList
        venues={venues}
        urls={{ 'u-volpe': 'https://signed.test/a' }}
        onOpen={jest.fn()}
      />,
    );
    expect(screen.getAllByTestId('avatar-image', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByText('O', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('un tap apre il locale', async () => {
    const onOpen = jest.fn();
    await render(<FriendVenueList venues={venues} urls={{}} onOpen={onOpen} />);
    await fireEvent.press(screen.getByText('Arena Club'));
    expect(onOpen).toHaveBeenCalledWith('v1');
  });

  it('un tap sul volto di un amico apre il suo profilo, non il locale', async () => {
    const onOpen = jest.fn();
    const onOpenFriend = jest.fn();
    await render(
      <FriendVenueList venues={venues} urls={{}} onOpen={onOpen} onOpenFriend={onOpenFriend} />,
    );
    await fireEvent.press(screen.getByLabelText('ui:profileLink.open({"handle":"@orso.grigio"})'));
    expect(onOpenFriend).toHaveBeenCalledWith('orso.grigio');
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('senza amici nei locali dice che nessuno ha dichiarato', async () => {
    await render(<FriendVenueList venues={[]} urls={{}} onOpen={jest.fn()} />);
    expect(screen.getByText('map:friendsEmpty')).toBeOnTheScreen();
  });
});
