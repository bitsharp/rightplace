import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { mockMeasureInWindow, resetMeasureInWindow } from '@/test/measure';

import { AnchorRegistryContext, createAnchorRegistry } from '../anchorRegistry';
import { TourAnchor } from './TourAnchor';

const RECT = { x: 12, y: 34, width: 56, height: 78 };

describe('TourAnchor', () => {
  afterEach(() => resetMeasureInWindow());

  it('registra la posizione dell’elemento nella finestra', async () => {
    mockMeasureInWindow(RECT);
    const registry = createAnchorRegistry();
    await render(
      <AnchorRegistryContext.Provider value={registry}>
        <TourAnchor id="friends.search">
          <Text>cerca</Text>
        </TourAnchor>
      </AnchorRegistryContext.Provider>,
    );
    expect(registry.rectOf('friends.search')).toEqual(RECT);
  });

  it('la toglie dal registro quando l’elemento sparisce', async () => {
    mockMeasureInWindow(RECT);
    const registry = createAnchorRegistry();
    const tree = (
      <AnchorRegistryContext.Provider value={registry}>
        <TourAnchor id="friends.search">
          <Text>cerca</Text>
        </TourAnchor>
      </AnchorRegistryContext.Provider>
    );
    const { unmount } = await render(tree);
    await unmount();
    expect(registry.rectOf('friends.search')).toBeNull();
  });

  it('mostra i figli senza cambiarli', async () => {
    const { getByText } = await render(
      <TourAnchor id="friends.search">
        <Text>cerca</Text>
      </TourAnchor>,
    );
    expect(getByText('cerca')).toBeOnTheScreen();
  });
});
