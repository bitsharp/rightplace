import { fireEvent, render, screen } from '@testing-library/react-native';
import { Platform } from 'react-native';

import type { FriendVenue } from '../domain/mapLayers';

import { FriendsSheet } from './FriendsSheet';

jest.mock('@/features/profile/avatar/hooks', () => ({
  useAvatarUrls: jest.fn(() => ({ 'u-volpe': 'https://signed.test/a' })),
}));

const venue: FriendVenue = {
  venueId: 'v1',
  name: 'Arena Club',
  handles: ['volpe.viola', 'orso.grigio'],
  friendIds: ['u-volpe', 'u-orso'],
  count: 2,
};

const setup = (overrides: Partial<FriendVenue> = {}) => {
  const props = { onClose: jest.fn(), onOpenFriend: jest.fn(), onOpenVenue: jest.fn() };
  return {
    ...props,
    ui: <FriendsSheet venue={{ ...venue, ...overrides }} {...props} />,
  };
};

describe('FriendsSheet', () => {
  beforeEach(() => jest.replaceProperty(Platform, 'OS', 'android'));
  afterEach(() => jest.restoreAllMocks());

  it('ha il nome del locale come titolo e una riga per amico', async () => {
    await render(setup().ui);
    expect(screen.getByText('Arena Club')).toBeOnTheScreen();
    expect(screen.getByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText('@orso.grigio')).toBeOnTheScreen();
  });

  it('mostra la foto di chi è visibile e l’iniziale degli altri', async () => {
    await render(setup().ui);
    expect(screen.getAllByTestId('avatar-image', { includeHiddenElements: true })).toHaveLength(1);
  });

  it('un tap sulla riga chiude il foglio e apre il profilo', async () => {
    const { ui, onClose, onOpenFriend } = setup();
    await render(ui);
    await fireEvent.press(screen.getByLabelText('ui:profileLink.open({"handle":"@orso.grigio"})'));
    expect(onClose).toHaveBeenCalled();
    expect(onOpenFriend).toHaveBeenCalledWith('orso.grigio');
  });

  it('“Vedi locale” chiude il foglio e apre il locale', async () => {
    const { ui, onClose, onOpenVenue } = setup();
    await render(ui);
    await fireEvent.press(screen.getByText('map:friendsSheet.openVenue'));
    expect(onClose).toHaveBeenCalled();
    expect(onOpenVenue).toHaveBeenCalledWith('v1');
  });

  it('con l’elenco troncato aggiunge “e altri N”, non tappabile', async () => {
    const { ui, onOpenFriend } = setup({ count: 7 });
    await render(ui);
    const more = screen.getByText('map:friendsSheet.more({"count":5})');
    await fireEvent.press(more);
    expect(onOpenFriend).not.toHaveBeenCalled();
  });

  it('senza troncamento non mostra “e altri”', async () => {
    await render(setup().ui);
    expect(screen.queryByText(/friendsSheet\.more/)).toBeNull();
  });

  it('su iOS apre la destinazione solo a foglio chiuso (onDismiss)', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    const { ui, onOpenFriend } = setup();
    await render(ui);
    await fireEvent.press(screen.getByLabelText('ui:profileLink.open({"handle":"@volpe.viola"})'));
    expect(onOpenFriend).not.toHaveBeenCalled();
    await fireEvent(screen.getByTestId('sheet-modal'), 'dismiss');
    expect(onOpenFriend).toHaveBeenCalledWith('volpe.viola');
  });
});
