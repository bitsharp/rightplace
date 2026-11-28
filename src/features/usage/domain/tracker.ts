export const TOUCH_INTERVAL_MS = 60_000;

// The server side of tracking, injected so the tracker stays testable without Supabase.
export type TrackingApi = {
  start: () => Promise<number | null>;
  touch: (id: number) => Promise<void>;
  end: (id: number) => Promise<void>;
};

export type UsageTracker = {
  foreground: () => Promise<void>;
  background: () => Promise<void>;
};

// One usage session per foreground period. Never blocks and never throws: every failure goes to `warn`.
// No timer runs while the app is in the background (principle 3 spirit: nothing happens behind the user's back).
export function createUsageTracker(
  api: TrackingApi,
  warn: (message: string, error: unknown) => void,
) {
  let phase: 'idle' | 'starting' | 'active' = 'idle';
  let generation = 0;
  let sessionId: number | null = null;
  let timer: ReturnType<typeof setInterval> | null = null;

  const attempt = async (label: string, call: () => Promise<unknown>) => {
    try {
      await call();
    } catch (error) {
      warn(`usage ${label} failed`, error);
    }
  };

  const foreground = async () => {
    if (phase !== 'idle') return;
    phase = 'starting';
    const mine = ++generation;
    let id: number | null = null;
    await attempt('start', async () => {
      id = await api.start();
    });
    if (mine !== generation) {
      // went to the background while the server was answering: close what just opened
      if (id !== null) await attempt('end', () => api.end(id as number));
      return;
    }
    phase = 'active';
    sessionId = id;
    if (id !== null) {
      timer = setInterval(
        () => void attempt('touch', () => api.touch(id as number)),
        TOUCH_INTERVAL_MS,
      );
    }
  };

  const background = async () => {
    generation += 1;
    phase = 'idle';
    if (timer !== null) clearInterval(timer);
    timer = null;
    const id = sessionId;
    sessionId = null;
    if (id !== null) await attempt('end', () => api.end(id));
  };

  return { foreground, background } satisfies UsageTracker;
}
