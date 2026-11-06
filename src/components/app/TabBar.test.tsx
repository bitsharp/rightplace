import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { colors, heights } from '@/theme/tokens';

import { TAB_NAMES, TabBar } from './TabBar';

describe('TabBar', () => {
  it('ha le 5 voci del mock-up in ordine, alta 72', async () => {
    await render(<TabBar active="map" onSelect={jest.fn()} />);
    expect(TAB_NAMES).toEqual(['map', 'friends', 'chat', 'feed', 'profile']);
    expect(screen.getAllByRole('tab').map((tab) => tab.props.accessibilityLabel)).toEqual(
      TAB_NAMES.map((name) => `common:tabs.${name}`),
    );
    expect(screen.getByTestId('tab-bar')).toHaveStyle({ height: heights.tabBar });
  });

  it('colora di viola la voce attiva e di grigio le altre', async () => {
    await render(<TabBar active="feed" onSelect={jest.fn()} />);
    expect(screen.getByRole('tab', { name: 'common:tabs.feed' })).toBeSelected();
    expect(screen.getByText('common:tabs.feed')).toHaveStyle({ color: colors.primary });
    expect(screen.getByText('common:tabs.map')).toHaveStyle({ color: colors.textSecondary });
  });

  it('notifica la voce toccata', async () => {
    const onSelect = jest.fn();
    await render(<TabBar active="map" onSelect={onSelect} />);
    await fireEvent.press(screen.getByRole('tab', { name: 'common:tabs.chat' }));
    expect(onSelect).toHaveBeenCalledWith('chat');
  });
});

describe('TabBar: pallino con il numero di richieste', () => {
  it('mostra il numero sulla voce Amici con la descrizione per i lettori di schermo', async () => {
    await render(<TabBar active="map" onSelect={jest.fn()} badges={{ friends: 3 }} />);
    const badge = screen.getByLabelText('common:tabBadge({"count":3})');
    expect(badge).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('non mostra nulla senza richieste', async () => {
    await render(<TabBar active="map" onSelect={jest.fn()} badges={{ friends: 0 }} />);
    expect(screen.queryByTestId('tab-badge-friends')).not.toBeOnTheScreen();
  });

  it('senza la proprietà badges la barra resta identica', async () => {
    await render(<TabBar active="map" onSelect={jest.fn()} />);
    TAB_NAMES.forEach((name) => expect(screen.queryByTestId(`tab-badge-${name}`)).toBeNull());
  });

  it('oltre 9 richieste mostra 9+', async () => {
    await render(<TabBar active="map" onSelect={jest.fn()} badges={{ friends: 14 }} />);
    expect(screen.getByText('9+')).toBeOnTheScreen();
    expect(screen.getByLabelText('common:tabBadge({"count":14})')).toBeOnTheScreen();
  });

  it('il pallino usa il viola del design system', async () => {
    await render(<TabBar active="map" onSelect={jest.fn()} badges={{ friends: 2 }} />);
    expect(screen.getByTestId('tab-badge-friends')).toHaveStyle({
      backgroundColor: colors.primary,
    });
  });
});

describe('isTabName', () => {
  it('riconosce solo le 5 voci della tab bar', () => {
    const { isTabName } = jest.requireActual<typeof import('./TabBar')>('./TabBar');
    expect(isTabName('feed')).toBe(true);
    expect(isTabName('venue')).toBe(false);
  });
});

describe('TabBar badge', () => {
  describe('layout', () => {
    it('è grande almeno 18 e centra il testo', async () => {
      await render(<TabBar active="map" onSelect={jest.fn()} badges={{ friends: 3 }} />);
      const badge = StyleSheet.flatten(screen.getByTestId('tab-badge-friends').props.style);
      expect(badge.minWidth).toBeGreaterThanOrEqual(18);
      expect(badge.height).toBeGreaterThanOrEqual(18);
      expect(badge).toMatchObject({ alignItems: 'center', justifyContent: 'center' });
      const text = StyleSheet.flatten(screen.getByText('3').props.style);
      expect(text.lineHeight).toBeLessThanOrEqual(badge.height as number);
      expect(text.textAlign).toBe('center');
    });

    it('nessun contenitore fino alla barra ritaglia il badge', async () => {
      await render(<TabBar active="map" onSelect={jest.fn()} badges={{ friends: 3 }} />);
      let node = screen.getByTestId('tab-badge-friends').parent;
      while (node) {
        expect(StyleSheet.flatten(node.props.style)?.overflow).not.toBe('hidden');
        node = node.parent;
      }
    });

    it('è ancorato al riquadro dell’icona, non alla voce', async () => {
      await render(<TabBar active="map" onSelect={jest.fn()} badges={{ friends: 3 }} />);
      const anchor = screen.getByTestId('tab-badge-friends').parent;
      expect(StyleSheet.flatten(anchor?.props.style)).toMatchObject({ overflow: 'visible' });
    });
  });
});
