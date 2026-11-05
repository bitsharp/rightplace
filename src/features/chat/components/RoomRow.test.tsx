import { fireEvent, render, screen } from '@testing-library/react-native';

import type { ChatRoom } from '../api';
import { RoomRow } from './RoomRow';

const room = (overrides: Partial<ChatRoom> = {}): ChatRoom => ({
  roomId: 'r1',
  venueId: 'v1',
  venueName: 'Arena Club',
  eventId: null,
  eventName: null,
  expiresAt: '2026-11-09T04:00:00Z',
  friendsInside: 2,
  photoCount: 0,
  lastKind: 'text',
  lastText: 'ci vediamo alle 11',
  lastHandle: 'volpe.viola',
  lastAt: '2026-11-07T22:00:00Z',
  ...overrides,
});

describe('RoomRow', () => {
  it("mostra il locale, quanti amici ci sono e l'ultimo messaggio", async () => {
    await render(<RoomRow room={room()} onPress={jest.fn()} />);
    expect(screen.getByText('Arena Club')).toBeOnTheScreen();
    expect(screen.getByText('chat:list.friendsInside({"count":2})')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'chat:list.lastMessage({"handle":"@volpe.viola","text":"ci vediamo alle 11"})',
      ),
    ).toBeOnTheScreen();
  });

  it("per una serata creator mostra il nome dell'evento", async () => {
    await render(
      <RoomRow room={room({ eventId: 'e1', eventName: 'Notte Neon' })} onPress={jest.fn()} />,
    );
    expect(screen.getByText('Notte Neon')).toBeOnTheScreen();
  });

  it("se l'ultimo è una foto lo dice a parole", async () => {
    await render(
      <RoomRow room={room({ lastKind: 'photo', lastText: null })} onPress={jest.fn()} />,
    );
    expect(
      screen.getByText(
        'chat:list.lastMessage({"handle":"@volpe.viola","text":"chat:list.photoMessage"})',
      ),
    ).toBeOnTheScreen();
  });

  it('senza messaggi visibili invita a scrivere', async () => {
    await render(
      <RoomRow
        room={room({ lastKind: null, lastText: null, lastHandle: null, lastAt: null })}
        onPress={jest.fn()}
      />,
    );
    expect(screen.getByText('chat:list.noMessages')).toBeOnTheScreen();
  });

  it('un tocco apre la chat', async () => {
    const onPress = jest.fn();
    await render(<RoomRow room={room()} onPress={onPress} />);
    await fireEvent.press(screen.getByText('Arena Club'));
    expect(onPress).toHaveBeenCalledWith('r1');
  });
});
