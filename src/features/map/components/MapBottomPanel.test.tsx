import { fireEvent, render, screen } from '@testing-library/react-native';

import type { BusiestVenue } from '../api';

import { MapBottomPanel } from './MapBottomPanel';

const busiest: BusiestVenue[] = [
  {
    venueId: 'v1',
    name: 'Tocqueville 13',
    kind: 'club',
    typicalLevel: 3,
    photoUrl: null,
    goingBand: '20–30',
    maybeBand: '3–10',
  },
];

const base = {
  loaded: true,
  loadFailed: false,
  friendVenues: [],
  avatarUrls: {},
  featured: null,
  you: null,
  sponsored: null,
  recommended: null,
  declaration: null,
  busiest,
  busiestNow: new Date('2026-11-27T12:00:00Z'),
  onOpenVenue: jest.fn(),
  onSelectBusiest: jest.fn(),
};

describe('MapBottomPanel: "I più animati"', () => {
  it('nella mappa generale mostra la card', async () => {
    await render(<MapBottomPanel view="general" {...base} />);
    expect(screen.getByText('map:busiest.title({"day":"venerdì"})')).toBeOnTheScreen();
  });

  it('nella mappa amici non la mostra', async () => {
    await render(<MapBottomPanel view="friends" {...base} />);
    expect(screen.queryByText(/map:busiest/)).not.toBeOnTheScreen();
  });

  it('senza righe non la mostra', async () => {
    await render(<MapBottomPanel view="general" {...base} busiest={[]} />);
    expect(screen.queryByText(/map:busiest/)).not.toBeOnTheScreen();
  });

  it('il tap su una card passa da onSelectBusiest (prima la mappa), non apre subito il dettaglio', async () => {
    const onSelectBusiest = jest.fn();
    const onOpenVenue = jest.fn();
    await render(
      <MapBottomPanel
        view="general"
        {...base}
        onSelectBusiest={onSelectBusiest}
        onOpenVenue={onOpenVenue}
      />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'Tocqueville 13' }));
    expect(onSelectBusiest).toHaveBeenCalledWith('v1');
    expect(onOpenVenue).not.toHaveBeenCalled();
  });
});
