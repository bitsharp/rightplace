import { render, screen } from '@testing-library/react-native';
import { AppState, Text } from 'react-native';

import { AppProviders } from './AppProviders';

jest.mock('expo-router', () => ({
  DarkTheme: { colors: {} },
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('AppProviders', () => {
  afterEach(() => jest.restoreAllMocks());

  it("collega il focus delle query allo stato dell'app e lo scollega allo smontaggio", async () => {
    const remove = jest.fn();
    const spy = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove });
    const view = await render(
      <AppProviders>
        <Text>child</Text>
      </AppProviders>,
    );
    expect(spy).toHaveBeenCalledWith('change', expect.any(Function));
    await view.unmount();
    expect(remove).toHaveBeenCalled();
  });

  it('monta una sola volta il KeyboardProvider edge-to-edge sopra tutta l’app', async () => {
    await render(
      <AppProviders>
        <Text>child</Text>
      </AppProviders>,
    );
    const provider = screen.getByTestId('keyboard-provider');
    expect(provider.props.statusBarTranslucent).toBe(true);
    expect(provider.props.navigationBarTranslucent).toBe(true);
    expect(screen.getByText('child')).toBeOnTheScreen();
  });
});
