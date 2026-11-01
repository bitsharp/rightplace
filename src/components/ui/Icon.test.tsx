import { render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/tokens';

import { ICON_NAMES, Icon } from './Icon';

describe('Icon', () => {
  it.each(ICON_NAMES)('disegna %s con il colore del token', async (name) => {
    await render(<Icon name={name} color="maybe" />);
    expect(screen.getByTestId(`icon-${name}`, { includeHiddenElements: true })).toHaveProp(
      'stroke',
      colors.maybe,
    );
  });

  it('è decorativa per gli screen reader', async () => {
    await render(<Icon name="search" />);
    expect(screen.getByTestId('icon-search', { includeHiddenElements: true })).toHaveProp(
      'accessibilityElementsHidden',
      true,
    );
  });

  it('riempie il cuore quando richiesto', async () => {
    await render(<Icon name="heart" color="going" filled />);
    expect(screen.getByTestId('icon-heart', { includeHiddenElements: true })).toHaveProp(
      'fill',
      colors.going,
    );
  });
});
