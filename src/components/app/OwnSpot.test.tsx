import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

import { OwnSpot } from './OwnSpot';

const renderOwn = async (intent: 'going' | 'maybe', photo?: { uri: string; cacheKey: string }) => {
  const onPress = jest.fn();
  await render(<OwnSpot intent={intent} initial="l" photo={photo} onPress={onPress} />);
  return onPress;
};

const ring = () => StyleSheet.flatten(screen.getByTestId('own-ring').props.style);

describe('OwnSpot', () => {
  it('"Ci vado": anello viola spesso 3 px con alone, e nessun testo "CI VAI"', async () => {
    await renderOwn('going');
    expect(ring()).toMatchObject({ borderColor: colors.primary, borderWidth: 3 });
    expect(screen.getByTestId('own-glow', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByText('map:own.going', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByRole('button', { name: 'map:own.marker.going' })).toBeOnTheScreen();
  });

  it('"Forse": anello ciano', async () => {
    await renderOwn('maybe');
    expect(ring()).toMatchObject({ borderColor: colors.maybe, borderWidth: 3 });
    expect(screen.getByRole('button', { name: 'map:own.marker.maybe' })).toBeOnTheScreen();
  });

  it('senza foto mostra la mia iniziale, con la foto l’immagine', async () => {
    await renderOwn('going');
    expect(screen.getByText('L', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('con la foto mostra l’immagine', async () => {
    await renderOwn('going', { uri: 'https://signed.test/me', cacheKey: 'me' });
    expect(screen.getByTestId('avatar-image', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('un tap chiama onPress', async () => {
    const onPress = await renderOwn('going');
    await fireEvent.press(screen.getByRole('button', { name: 'map:own.marker.going' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
