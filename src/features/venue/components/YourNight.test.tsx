import { fireEvent, render, screen } from '@testing-library/react-native';

import type { VenueFriend } from '../api';
import type { TransportLink } from '../domain/transport';
import { NightFriends, NightTransport, NightVenueCard } from './YourNight';

const links: TransportLink[] = [
  { provider: 'taxi', primaryUrl: 'tel:+39028585' },
  { provider: 'uber', primaryUrl: 'https://m.uber.com/x' },
  { provider: 'transit', primaryUrl: 'https://www.google.com/maps/dir/' },
];

const friends: VenueFriend[] = [
  { userId: 'u-volpe', handle: 'volpe.viola', ageBand: '18-24', gender: 'female', intent: 'going' },
  { userId: 'u-orso', handle: 'orso.grigio', ageBand: '25-34', gender: 'male', intent: 'maybe' },
];

describe('NightVenueCard', () => {
  const base = {
    name: 'Arena Club',
    photoUrl: null,
    kind: 'bar' as const,
    address: 'Via Test 1, Milano',
    status: { kind: 'open', closesAt: '04:00' } as const,
    onPress: jest.fn(),
  };

  it('mostra nome, stato e indirizzo del locale', async () => {
    await render(<NightVenueCard {...base} />);
    expect(screen.getByText('Arena Club')).toBeOnTheScreen();
    expect(screen.getByText('venue:status.open({"time":"04:00"})')).toBeOnTheScreen();
    expect(screen.getByText('Via Test 1, Milano')).toBeOnTheScreen();
  });

  it('con la foto di copertina la mostra con la didascalia a voce; senza, il segnaposto del tipo', async () => {
    const url = 'https://lh3.googleusercontent.com/p/abc';
    await render(<NightVenueCard {...base} photoUrl={url} />);
    expect(screen.getByLabelText('venue:cover.caption')).toBeOnTheScreen();
    await screen.rerender(<NightVenueCard {...base} />);
    expect(screen.getByTestId('venue-cover-art-bar')).toBeOnTheScreen();
  });

  it('la freccia riporta al locale', async () => {
    const onPress = jest.fn();
    await render(<NightVenueCard {...base} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'venue:yourNight.openVenue' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('NightTransport', () => {
  it('mostra un riquadro per servizio, senza tempi stimati', async () => {
    await render(<NightTransport links={links} onOpen={jest.fn()} />);
    expect(screen.getByText('venue:yourNight.transport.taxi')).toBeOnTheScreen();
    expect(screen.getByText('venue:yourNight.transport.uber')).toBeOnTheScreen();
    expect(screen.getByText('venue:yourNight.transport.transit')).toBeOnTheScreen();
    expect(screen.queryByText(/min/i)).toBeNull();
    expect(screen.queryByText(/\d/)).toBeNull();
  });

  it('il tocco apre il link esistente di quel servizio', async () => {
    const onOpen = jest.fn();
    await render(<NightTransport links={links} onOpen={onOpen} />);
    await fireEvent.press(screen.getByText('venue:yourNight.transport.uber'));
    expect(onOpen).toHaveBeenCalledWith(links[1]);
  });
});

describe('NightFriends', () => {
  it('titolo con il numero di amici e i loro volti', async () => {
    await render(
      <NightFriends friends={friends} urls={{}} myHandle={null} onOpenFriend={jest.fn()} />,
    );
    expect(screen.getByText('venue:yourNight.friends({"count":2})')).toBeOnTheScreen();
    expect(screen.getByTestId('friend-faces')).toBeOnTheScreen();
  });

  it('foto per chi la rende visibile, iniziale per gli altri', async () => {
    await render(
      <NightFriends
        friends={friends}
        urls={{ 'u-volpe': 'https://signed.test/a/v' }}
        myHandle={null}
        onOpenFriend={jest.fn()}
      />,
    );
    expect(screen.getAllByTestId('avatar-image', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByText('O', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('elenca anche gli @handle degli amici che vanno qui', async () => {
    await render(
      <NightFriends friends={friends} urls={{}} myHandle="lince.rosso" onOpenFriend={jest.fn()} />,
    );
    expect(screen.getByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText('@orso.grigio')).toBeOnTheScreen();
  });

  it('il tocco sul volto o sull’@handle apre il profilo', async () => {
    const onOpenFriend = jest.fn();
    await render(
      <NightFriends friends={friends} urls={{}} myHandle={null} onOpenFriend={onOpenFriend} />,
    );
    const links = screen.getAllByLabelText('ui:profileLink.open({"handle":"@orso.grigio"})');
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) await fireEvent.press(link);
    expect(onOpenFriend).toHaveBeenCalledTimes(links.length);
    expect(onOpenFriend).toHaveBeenCalledWith('orso.grigio');
  });

  it('senza amici: invito a invitarli con il bottone di condivisione dell’@tag, nessun volto', async () => {
    await render(
      <NightFriends friends={[]} urls={{}} myHandle="lince.rosso" onOpenFriend={jest.fn()} />,
    );
    expect(screen.getByText('venue:yourNight.friends({"count":0})')).toBeOnTheScreen();
    expect(screen.getByText('venue:yourNight.friendsEmpty')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'profile:share.cta' })).toBeOnTheScreen();
    expect(screen.queryByTestId('friend-faces')).toBeNull();
  });

  it('senza @tag proprio (profilo non ancora caricato) niente bottone di condivisione', async () => {
    await render(<NightFriends friends={[]} urls={{}} myHandle={null} onOpenFriend={jest.fn()} />);
    expect(screen.getByText('venue:yourNight.friendsEmpty')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'profile:share.cta' })).toBeNull();
  });
});
