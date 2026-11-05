import { chunk } from './batch';

describe('chunk', () => {
  it('divide in gruppi della dimensione richiesta, l’ultimo più corto', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('1001 elementi in blocchi da 500 sono tre blocchi', () => {
    const sizes = chunk(
      Array.from({ length: 1001 }, (_, index) => index),
      500,
    ).map((c) => c.length);
    expect(sizes).toEqual([500, 500, 1]);
  });

  it('una lista vuota non produce blocchi', () => {
    expect(chunk([], 500)).toEqual([]);
  });

  it('rifiuta una dimensione non positiva', () => {
    expect(() => chunk([1], 0)).toThrow(RangeError);
  });
});
