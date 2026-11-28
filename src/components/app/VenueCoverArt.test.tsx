import { render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/tokens';

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

  describe('stile fumetto', () => {
    const kinds = ['club', 'rooftop', 'bar', 'live', 'other'] as const;
    const sceneOf = (kind: string) => (kind === 'other' ? 'generic' : kind);

    it.each(kinds)('il tipo %s disegna la sua scena', async (kind) => {
      await render(<VenueCoverArt kind={kind} />);
      expect(
        screen.getByTestId(`cover-scene-${sceneOf(kind)}`, { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it.each(kinds)('il tipo %s ha contorni neri spessi', async (kind) => {
      await render(<VenueCoverArt kind={kind} />);
      const outlines = screen.getByTestId('cover-outlines', { includeHiddenElements: true });
      expect(outlines.props.stroke).toBeDefined();
      expect(outlines).toHaveProp('strokeWidth', expect.any(Number));
      expect(outlines.props.strokeWidth).toBeGreaterThanOrEqual(2);
      expect(outlines.props.strokeWidth).toBeLessThanOrEqual(3);
      expect(colors.ink).toBe('#05050A');
    });

    it.each(kinds)('il tipo %s ha il retino a puntini (halftone)', async (kind) => {
      await render(<VenueCoverArt kind={kind} />);
      expect(
        screen.getByTestId('cover-halftone', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(
        screen.getAllByTestId('cover-shade', { includeHiddenElements: true }).length,
      ).toBeGreaterThan(0);
    });
  });
});
