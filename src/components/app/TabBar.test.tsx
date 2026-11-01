import { fireEvent, render, screen } from '@testing-library/react-native';

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

describe('isTabName', () => {
  it('riconosce solo le 5 voci della tab bar', () => {
    const { isTabName } = jest.requireActual<typeof import('./TabBar')>('./TabBar');
    expect(isTabName('feed')).toBe(true);
    expect(isTabName('venue')).toBe(false);
  });
});
