import { fireEvent, render, screen } from '@testing-library/react-native';

import { UiKitScreen } from './UiKitScreen';

const SECTIONS = [
  'colors',
  'typography',
  'buttons',
  'selection',
  'fields',
  'states',
  'map',
  'social',
  'creator',
  'navigation',
];

describe('UiKitScreen', () => {
  it('mostra una sezione per ogni gruppo di componenti', async () => {
    await render(<UiKitScreen />);
    for (const section of SECTIONS) {
      expect(screen.getByRole('header', { name: `dev:sections.${section}` })).toBeOnTheScreen();
    }
  });

  it('apre e chiude il bottom sheet di prova', async () => {
    await render(<UiKitScreen />);
    await fireEvent.press(screen.getByRole('button', { name: 'dev:sample.openSheet' }));
    expect(screen.getByText('dev:sample.sheetBody')).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId('sheet-backdrop', { includeHiddenElements: true }));
    expect(screen.queryByText('dev:sample.sheetBody')).not.toBeOnTheScreen();
  });

  it('mostra il "+" della TopBar solo dopo aver attivato la dichiarazione', async () => {
    await render(<UiKitScreen />);
    expect(screen.queryByRole('button', { name: 'ui:topBar.post' })).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('switch', { name: 'dev:sample.canPost' }));
    expect(screen.getByRole('button', { name: 'ui:topBar.post' })).toBeOnTheScreen();
  });
});
