import { render, screen } from '@testing-library/react-native';

import { VenueCoverArt } from './VenueCoverArt';

describe('VenueCoverArt', () => {
  it.each([
    ['club', 'club'],
    ['rooftop', 'rooftop'],
    ['bar', 'bar'],
    ['live', 'live'],
    ['other', 'generic'],
    ['spot', 'generic'],
  ] as const)('il locale di tipo %s mostra la scena %s', async (kind, scene) => {
    await render(<VenueCoverArt kind={kind} />);
    expect(screen.getByTestId(`venue-cover-art-${scene}`)).toBeOnTheScreen();
  });

  it('descrive l’illustrazione a voce con il tipo del locale', async () => {
    await render(<VenueCoverArt kind="club" />);
    expect(
      screen.getByLabelText('ui:coverArt.label({"kind":"ui:coverArt.kind.club"})'),
    ).toBeOnTheScreen();
  });

  it('un tipo sconosciuto ricade sulla scena generica', async () => {
    await render(<VenueCoverArt kind="casino" />);
    expect(screen.getByTestId('venue-cover-art-generic')).toBeOnTheScreen();
  });

  it('non dichiara mai di essere una foto di Google Maps', async () => {
    await render(<VenueCoverArt kind="bar" />);
    expect(screen.queryByText('venue:cover.caption')).toBeNull();
    expect(screen.queryByLabelText('venue:cover.caption')).toBeNull();
  });
});
