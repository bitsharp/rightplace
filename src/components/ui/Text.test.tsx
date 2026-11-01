import { render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/tokens';
import { typography } from '@/theme/typography';

import { MonoLabel } from './MonoLabel';
import { Text } from './Text';

describe('Text', () => {
  it('applica variante tipografica e colore dai token', async () => {
    await render(
      <Text variant="display26" color="textSecondary">
        titolo
      </Text>,
    );
    expect(screen.getByText('titolo')).toHaveStyle({
      ...typography.display26,
      color: colors.textSecondary,
    });
  });

  it('usa body 15 e testo primario come default', async () => {
    await render(<Text>corpo</Text>);
    expect(screen.getByText('corpo')).toHaveStyle({ fontSize: 15, color: colors.text });
  });
});

describe('MonoLabel', () => {
  it('scrive in Space Mono maiuscolo con il colore dell’intento', async () => {
    await render(<MonoLabel tone="going">ui:labels.sponsored</MonoLabel>);
    expect(screen.getByText('ui:labels.sponsored')).toHaveStyle({
      fontFamily: typography.label10.fontFamily,
      color: colors.going,
      textTransform: 'uppercase',
    });
  });
});
