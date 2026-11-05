import { nextCursor } from './feedPages';

const page = (count: number) =>
  Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    visibleFrom: '2026-11-09T05:00:00.123456+00:00',
  }));

describe('nextCursor', () => {
  it('con una pagina piena riparte dall’ultimo post: visible_from e id insieme', () => {
    expect(nextCursor(page(20), 20)).toEqual({
      beforeVisible: '2026-11-09T05:00:00.123456+00:00',
      beforeId: 'p19',
    });
  });

  it('con una pagina incompleta o vuota non ce n’è un’altra', () => {
    expect(nextCursor(page(7), 20)).toBeUndefined();
    expect(nextCursor([], 20)).toBeUndefined();
  });
});
