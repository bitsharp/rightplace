import { fireEvent, render, screen } from '@testing-library/react-native';

import { FriendVenueList } from './FriendVenueList';

describe('FriendVenueList', () => {
  const venues = [
    { venueId: 'v1', name: 'Arena Club', handles: ['volpe.viola', 'orso.grigio'], count: 2 },
  ];

  it('elenca locale, numero di amici e i loro handle', async () => {
    await render(<FriendVenueList venues={venues} onOpen={jest.fn()} />);
    expect(
      screen.getByText('ui:friendsGoing({"count":2}) · @volpe.viola, @orso.grigio'),
    ).toBeOnTheScreen();
  });

  it('un tap apre il locale', async () => {
    const onOpen = jest.fn();
    await render(<FriendVenueList venues={venues} onOpen={onOpen} />);
    await fireEvent.press(screen.getByText('Arena Club'));
    expect(onOpen).toHaveBeenCalledWith('v1');
  });

  it('senza amici nei locali dice che nessuno ha dichiarato', async () => {
    await render(<FriendVenueList venues={[]} onOpen={jest.fn()} />);
    expect(screen.getByText('map:friendsEmpty')).toBeOnTheScreen();
  });
});
