import {
  endPress,
  LONG_PRESS_MOVE_TOLERANCE_PX,
  movePress,
  pressProgress,
  SPOT_LONG_PRESS_MS,
  startPress,
  tickPress,
  type PressState,
} from './longPress';

const IDLE: PressState = { kind: 'idle' };
const at = (x: number, y: number) => ({ x, y });

describe('pressione lunga per creare uno spot', () => {
  it('dura 3 secondi', () => {
    expect(SPOT_LONG_PRESS_MS).toBe(3000);
  });

  it('un dito che tocca avvia la pressione con progresso 0', () => {
    const state = startPress(IDLE, at(100, 200), 1000, 1);
    expect(state).toEqual({ kind: 'pressing', origin: at(100, 200), startedAt: 1000, progress: 0 });
  });

  it('il progresso cresce col tempo e arriva a "fired" a 3 secondi', () => {
    const start = startPress(IDLE, at(10, 10), 0, 1);
    const half = tickPress(start, SPOT_LONG_PRESS_MS / 2);
    expect(half.kind).toBe('pressing');
    expect(pressProgress(half)).toBeCloseTo(0.5);
    expect(tickPress(start, SPOT_LONG_PRESS_MS - 1).kind).toBe('pressing');
    expect(tickPress(start, SPOT_LONG_PRESS_MS)).toEqual({ kind: 'fired', origin: at(10, 10) });
  });

  it('un movimento oltre la tolleranza annulla (è un pan)', () => {
    const start = startPress(IDLE, at(10, 10), 0, 1);
    const small = movePress(start, at(10 + LONG_PRESS_MOVE_TOLERANCE_PX, 10), 1);
    expect(small.kind).toBe('pressing');
    const big = movePress(start, at(10 + LONG_PRESS_MOVE_TOLERANCE_PX + 1, 10), 1);
    expect(big.kind).toBe('cancelled');
  });

  it('la tolleranza vale anche in verticale e in diagonale', () => {
    const start = startPress(IDLE, at(0, 0), 0, 1);
    expect(movePress(start, at(0, LONG_PRESS_MOVE_TOLERANCE_PX + 1), 1).kind).toBe('cancelled');
    const diagonal = Math.ceil(LONG_PRESS_MOVE_TOLERANCE_PX);
    expect(movePress(start, at(diagonal, diagonal), 1).kind).toBe('cancelled');
  });

  it("due dita annullano, all'inizio o durante la pressione (è un pinch)", () => {
    expect(startPress(IDLE, at(0, 0), 0, 2).kind).toBe('cancelled');
    const start = startPress(IDLE, at(0, 0), 0, 1);
    expect(movePress(start, at(0, 0), 2).kind).toBe('cancelled');
  });

  it('il tick non resuscita una pressione annullata', () => {
    const cancelled = movePress(startPress(IDLE, at(0, 0), 0, 1), at(100, 100), 1);
    expect(tickPress(cancelled, SPOT_LONG_PRESS_MS * 2).kind).toBe('cancelled');
  });

  it('rilasciare prima dei 3 secondi annulla senza scegliere alcun punto', () => {
    const start = startPress(IDLE, at(5, 5), 0, 1);
    expect(endPress(tickPress(start, 1500))).toEqual({ state: IDLE, picked: null });
  });

  it('rilasciare dopo i 3 secondi sceglie il punto di partenza', () => {
    const fired = tickPress(startPress(IDLE, at(5, 6), 0, 1), SPOT_LONG_PRESS_MS);
    expect(endPress(fired)).toEqual({ state: IDLE, picked: at(5, 6) });
  });

  it('dopo "fired" un piccolo spostamento non cambia l\'esito; un secondo dito sì', () => {
    const fired = tickPress(startPress(IDLE, at(5, 6), 0, 1), SPOT_LONG_PRESS_MS);
    expect(movePress(fired, at(40, 40), 1).kind).toBe('fired');
    expect(movePress(fired, at(5, 6), 2).kind).toBe('cancelled');
  });

  it('un gesto annullato torna a riposo al rilascio, senza punto', () => {
    const cancelled = startPress(IDLE, at(0, 0), 0, 2);
    expect(endPress(cancelled)).toEqual({ state: IDLE, picked: null });
  });

  it('il progresso è 0 a riposo e 1 quando è scattato', () => {
    expect(pressProgress(IDLE)).toBe(0);
    expect(pressProgress({ kind: 'fired', origin: at(0, 0) })).toBe(1);
  });
});
