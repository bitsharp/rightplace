import { supabase } from '@/lib/supabase';

import { backoffMs } from './realtime';

type Options = {
  roomId: string;
  onInsert: (row: unknown) => void;
  // Called after any gap in the connection: messages sent meanwhile were never delivered, so reload them.
  onRecovered: () => void;
};

export type RoomConnection = { reconnectNow: () => void; stop: () => void };

type Status = 'SUBSCRIBED' | 'TIMED_OUT' | 'CLOSED' | 'CHANNEL_ERROR';

// One Realtime channel per open chat. A stale channel's late status events are ignored through `generation`,
// so closing a channel ourselves never schedules a reconnect.
class RoomChannel implements RoomConnection {
  private generation = 0;
  private attempt = 0;
  private needsRecovery = false;
  private stopped = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private channel: ReturnType<typeof supabase.channel> | null = null;

  constructor(private readonly options: Options) {
    this.open();
  }

  reconnectNow = () => {
    clearTimeout(this.timer);
    this.close();
    this.open();
    this.options.onRecovered();
  };

  stop = () => {
    this.stopped = true;
    clearTimeout(this.timer);
    this.close();
  };

  private close() {
    this.generation += 1;
    if (this.channel) void supabase.removeChannel(this.channel);
    this.channel = null;
  }

  private open() {
    const mine = ++this.generation;
    const { roomId, onInsert } = this.options;
    this.channel = supabase
      .channel(`room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => onInsert(payload.new),
      )
      .subscribe((status) => this.onStatus(mine, status));
  }

  private onStatus(generation: number, status: Status) {
    if (this.stopped || generation !== this.generation) return;
    if (status !== 'SUBSCRIBED') return this.scheduleRetry();
    this.attempt = 0;
    if (this.needsRecovery) this.options.onRecovered();
    this.needsRecovery = false;
  }

  private scheduleRetry() {
    this.needsRecovery = true;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.close();
      this.open();
    }, backoffMs(this.attempt++));
  }
}

export function startRoomConnection(options: Options): RoomConnection {
  return new RoomChannel(options);
}
