import { render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { NightChatScreen } from './NightChatScreen';

jest.mock('../useNightChatScreen', () => ({
  useNightChatScreen: () => ({
    title: 'Arena Club',
    messages: [],
    photos: [],
    photoUrls: {},
    loadFailed: false,
    hasMore: false,
    loadOlder: jest.fn(),
    followingHandles: [],
    mentionableHandles: [],
    myHandle: 'lince.rosso',
    requestedHandles: [],
    expiryHours: null,
    send: jest.fn(),
    retry: jest.fn(),
    goBack: jest.fn(),
    follow: jest.fn(),
    select: jest.fn(),
    selected: null,
    viewer: { photos: [], index: null, open: jest.fn(), close: jest.fn() },
    photoFlow: {
      sheetOpen: false,
      notice: null,
      openSheet: jest.fn(),
      closeSheet: jest.fn(),
      choose: jest.fn(),
      onSheetDismiss: jest.fn(),
    },
  }),
}));

describe('NightChatScreen', () => {
  afterEach(() => jest.restoreAllMocks());

  it('tiene il campo di scrittura sopra la tastiera con il padding della libreria, su iOS e Android', async () => {
    for (const os of ['ios', 'android'] as const) {
      jest.replaceProperty(Platform, 'OS', os);
      await render(<NightChatScreen roomId="r1" />);
      expect(screen.getByTestId('chat-keyboard-avoider').props.behavior).toBe('padding');
      expect(screen.getByTestId('composer-dock')).toBeOnTheScreen();
      await screen.unmount();
    }
  });
});
