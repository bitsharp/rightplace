import { render, screen } from '@testing-library/react-native';

import { TAB_NAMES, TabIcon } from './TabIcon';

describe('TabIcon', () => {
  it('elenca le 5 voci della tab bar nell’ordine del mock-up', () => {
    expect(TAB_NAMES).toEqual(['map', 'friends', 'chat', 'feed', 'profile']);
  });

  it.each(TAB_NAMES)('disegna l’icona di %s con il colore ricevuto', async (name) => {
    await render(<TabIcon name={name} color="#9D6BFF" />);
    expect(screen.getByTestId(`tab-icon-${name}`)).toHaveProp('stroke', '#9D6BFF');
  });
});
