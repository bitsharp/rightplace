import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/tokens';

import { Avatar } from './Avatar';
import { HandleText } from './HandleText';

describe('Avatar', () => {
  it('mostra l’iniziale su un cerchio con il bordo dell’intento', async () => {
    await render(<Avatar initial="v" intent="maybe" size={40} />);
    expect(screen.getByText('V', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByTestId('avatar', { includeHiddenElements: true })).toHaveStyle({
      width: 40,
      borderRadius: 20,
      borderColor: colors.maybe,
      backgroundColor: colors.maybeSoft,
    });
  });

  it('funziona anche senza iniziale', async () => {
    await render(<Avatar intent="going" />);
    expect(screen.getByTestId('avatar', { includeHiddenElements: true })).toHaveStyle({
      borderColor: colors.going,
    });
  });
});

describe('Avatar con foto', () => {
  const photo = { uri: 'https://signed.test/a', cacheKey: 'user-1' };

  it('mostra la foto (solo in memoria, con chiave stabile) al posto dell’iniziale', async () => {
    await render(<Avatar intent="going" initial="v" photo={photo} size={80} />);
    const image = screen.getByTestId('avatar-image', { includeHiddenElements: true });
    expect(image.props).toMatchObject({
      cachePolicy: 'memory',
      source: [{ uri: 'https://signed.test/a', cacheKey: 'user-1' }],
    });
    expect(screen.queryByText('V', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByTestId('avatar', { includeHiddenElements: true })).toHaveStyle({
      width: 80,
      borderRadius: 40,
    });
  });

  it('senza foto (o se non si carica) torna all’iniziale col colore di sempre', async () => {
    await render(<Avatar intent="maybe" initial="v" photo={photo} />);
    await fireEvent(screen.getByTestId('avatar-image', { includeHiddenElements: true }), 'error', {
      nativeEvent: { error: 'load failed' },
    });
    expect(screen.queryByTestId('avatar-image', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('V', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('un nuovo URL dopo un errore riprova a caricare la foto', async () => {
    const { rerender } = await render(<Avatar intent="maybe" initial="v" photo={photo} />);
    await fireEvent(screen.getByTestId('avatar-image', { includeHiddenElements: true }), 'error', {
      nativeEvent: { error: 'load failed' },
    });
    await rerender(
      <Avatar intent="maybe" initial="v" photo={{ ...photo, uri: 'https://signed.test/b' }} />,
    );
    expect(screen.getByTestId('avatar-image', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe('HandleText', () => {
  it('mostra l’handle con una sola @', async () => {
    await render(<HandleText handle="@lince.rosso" />);
    expect(screen.getByText('@lince.rosso')).toBeOnTheScreen();
  });
});
