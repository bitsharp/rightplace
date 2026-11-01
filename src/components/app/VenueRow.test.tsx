import { fireEvent, render, screen } from '@testing-library/react-native';

import { FriendVenueRow } from './FriendVenueRow';
import { RecommendedCard, SponsoredCard } from './PromoCard';
import { VenueRow } from './VenueRow';

describe('VenueRow', () => {
  it('mostra nome, meta e fasce SI/FORSE e apre il locale', async () => {
    const onPress = jest.fn();
    await render(
      <VenueRow
        name="Bar Brera"
        meta="Bar · Milano"
        goingBand="20–30"
        maybeBand="pochi"
        onPress={onPress}
      />,
    );
    expect(screen.getByText('Bar Brera')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.going 20–30')).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.maybe ui:band.few')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalled();
  });

  it('etichetta i locali sponsorizzati', async () => {
    await render(
      <VenueRow
        name="A"
        meta="m"
        goingBand="pochi"
        maybeBand="pochi"
        sponsored
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('ui:labels.sponsored')).toBeOnTheScreen();
  });
});

describe('SponsoredCard / RecommendedCard', () => {
  it('etichettano la card come SPONSORIZZATA o CONSIGLIATA', async () => {
    await render(<SponsoredCard name="Arena" meta="m" onPress={jest.fn()} />);
    expect(screen.getByText('ui:labels.sponsored')).toBeOnTheScreen();
    await render(<RecommendedCard name="Sunset" meta="m" onPress={jest.fn()} />);
    expect(screen.getByText('ui:labels.recommended')).toBeOnTheScreen();
  });
});

describe('FriendVenueRow', () => {
  it('riassume quanti amici ci vanno e chi sono', async () => {
    await render(
      <FriendVenueRow
        venueName="Arena"
        friendHandles={['volpe.viola', '@orso.grigio']}
        onPress={jest.fn()}
      />,
    );
    expect(
      screen.getByText('ui:friendsGoing({"count":2}) · @volpe.viola, @orso.grigio'),
    ).toBeOnTheScreen();
  });
});
