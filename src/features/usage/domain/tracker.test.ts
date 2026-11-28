import { createUsageTracker, type TrackingApi } from './tracker';

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function fakeApi(overrides: Partial<TrackingApi> = {}): jest.Mocked<TrackingApi> {
  return {
    start: jest.fn(async () => 7),
    touch: jest.fn(async () => undefined),
    end: jest.fn(async () => undefined),
    ...overrides,
  } as jest.Mocked<TrackingApi>;
}

describe('usage tracker', () => {
  beforeEach(() => jest.useFakeTimers({ doNotFake: ['setImmediate'] }));
  afterEach(() => jest.useRealTimers());

  it('apre una sessione in primo piano e la tocca ogni 60 secondi', async () => {
    const api = fakeApi();
    const tracker = createUsageTracker(api, jest.fn());
    await tracker.foreground();
    expect(api.start).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(59_000);
    expect(api.touch).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1_000);
    expect(api.touch).toHaveBeenCalledWith(7);
    await jest.advanceTimersByTimeAsync(120_000);
    expect(api.touch).toHaveBeenCalledTimes(3);
  });

  it('chiude la sessione e ferma il timer quando va in background', async () => {
    const api = fakeApi();
    const tracker = createUsageTracker(api, jest.fn());
    await tracker.foreground();
    await tracker.background();
    expect(api.end).toHaveBeenCalledWith(7);
    await jest.advanceTimersByTimeAsync(300_000);
    expect(api.touch).not.toHaveBeenCalled();
  });

  it('non apre due sessioni se riceve due volte il primo piano', async () => {
    const api = fakeApi();
    const tracker = createUsageTracker(api, jest.fn());
    await Promise.all([tracker.foreground(), tracker.foreground()]);
    expect(api.start).toHaveBeenCalledTimes(1);
  });

  it('background senza sessione non chiama il server', async () => {
    const api = fakeApi();
    await createUsageTracker(api, jest.fn()).background();
    expect(api.end).not.toHaveBeenCalled();
  });

  it('chiude subito una sessione aperta mentre l’app andava già in background', async () => {
    let resolveStart: (id: number) => void = () => undefined;
    const api = fakeApi({
      start: jest.fn(() => new Promise<number | null>((r) => (resolveStart = r))),
    });
    const tracker = createUsageTracker(api, jest.fn());
    const starting = tracker.foreground();
    await tracker.background();
    resolveStart(9);
    await starting;
    await flush();
    expect(api.end).toHaveBeenCalledWith(9);
    await jest.advanceTimersByTimeAsync(120_000);
    expect(api.touch).not.toHaveBeenCalled();
  });

  it('il limite giornaliero (id nullo) non genera chiamate di touch né di end', async () => {
    const api = fakeApi({ start: jest.fn(async () => null) });
    const tracker = createUsageTracker(api, jest.fn());
    await tracker.foreground();
    await jest.advanceTimersByTimeAsync(120_000);
    await tracker.background();
    expect(api.touch).not.toHaveBeenCalled();
    expect(api.end).not.toHaveBeenCalled();
  });

  it('gli errori del server vengono segnalati al logger e non si propagano', async () => {
    const warn = jest.fn();
    const failure = new Error('rete');
    const api = fakeApi({
      start: jest.fn(async () => 3),
      touch: jest.fn(async () => Promise.reject(failure)),
      end: jest.fn(async () => Promise.reject(failure)),
    });
    const tracker = createUsageTracker(api, warn);
    await tracker.foreground();
    await jest.advanceTimersByTimeAsync(60_000);
    await expect(tracker.background()).resolves.toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('se start fallisce non parte nessun timer e l’errore non si propaga', async () => {
    const warn = jest.fn();
    const api = fakeApi({ start: jest.fn(async () => Promise.reject(new Error('x'))) });
    const tracker = createUsageTracker(api, warn);
    await expect(tracker.foreground()).resolves.toBeUndefined();
    await jest.advanceTimersByTimeAsync(120_000);
    expect(api.touch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
