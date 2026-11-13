import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors } from '@/theme/tokens';

import { SpotPressRing } from './SpotPressRing';

const ring = () => screen.getByTestId('spot-press-ring');

describe('SpotPressRing', () => {
  it('non disegna nulla senza pressione', async () => {
    await render(<SpotPressRing ring={null} offset={{ x: 0, y: 0 }} />);
    expect(screen.queryByTestId('spot-press-ring')).toBeNull();
  });

  it("si centra sul dito, al netto dell'origine della mappa", async () => {
    await render(
      <SpotPressRing ring={{ x: 150, y: 260, progress: 0.2 }} offset={{ x: 10, y: 60 }} />,
    );
    const style = StyleSheet.flatten(ring().props.style);
    expect(style.left).toBe(150 - 10 - Number(style.width) / 2);
    expect(style.top).toBe(260 - 60 - Number(style.height) / 2);
  });

  it('cresce con il progresso e ha il colore del token ciano', async () => {
    const { rerender } = await render(
      <SpotPressRing ring={{ x: 0, y: 0, progress: 0.1 }} offset={{ x: 0, y: 0 }} />,
    );
    const small = Number(
      StyleSheet.flatten(screen.getByTestId('spot-press-fill').props.style).width,
    );
    await rerender(<SpotPressRing ring={{ x: 0, y: 0, progress: 1 }} offset={{ x: 0, y: 0 }} />);
    const full = Number(
      StyleSheet.flatten(screen.getByTestId('spot-press-fill').props.style).width,
    );
    expect(full).toBeGreaterThan(small);
    expect(StyleSheet.flatten(ring().props.style).borderColor).toBe(colors.maybe);
  });

  it('non intercetta i tocchi: la mappa resta usabile', async () => {
    await render(<SpotPressRing ring={{ x: 0, y: 0, progress: 0.5 }} offset={{ x: 0, y: 0 }} />);
    expect(ring()).toHaveProp('pointerEvents', 'none');
  });
});
