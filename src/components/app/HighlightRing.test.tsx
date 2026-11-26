import { render, screen } from '@testing-library/react-native';

import { HighlightRing } from './HighlightRing';

describe('HighlightRing', () => {
  it('disegna un anello decorativo, nascosto alle tecnologie assistive', async () => {
    await render(<HighlightRing animated />);
    const ring = screen.getByTestId('highlight-ring', { includeHiddenElements: true });
    expect(ring.props.accessibilityElementsHidden).toBe(true);
    expect(ring.props.importantForAccessibility).toBe('no-hide-descendants');
  });

  it('con movimento ridotto è un anello statico, senza pulsazione', async () => {
    await render(<HighlightRing animated={false} />);
    expect(screen.getByTestId('highlight-ring', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(
      screen.getByTestId('highlight-ring-static', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });
});
