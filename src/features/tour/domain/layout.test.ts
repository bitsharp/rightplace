import { holePath, placeBubble, spotlightRect } from './layout';

const CONTAINER = { width: 400, height: 800 };

describe('spotlightRect', () => {
  it('allarga l’ancora del margine e la tiene dentro lo schermo', () => {
    expect(spotlightRect({ x: 0, y: 10, width: 100, height: 40 }, CONTAINER, 8)).toEqual({
      x: 0,
      y: 2,
      width: 108,
      height: 56,
    });
  });
});

describe('placeBubble', () => {
  it('mette il fumetto sotto l’ancora quando c’è spazio', () => {
    const placed = placeBubble({ x: 20, y: 100, width: 100, height: 40 }, CONTAINER);
    expect(placed.placement).toBe('below');
    expect(placed.offset).toBeGreaterThan(140);
  });

  it('lo mette sopra quando sotto non c’è spazio', () => {
    const placed = placeBubble({ x: 20, y: 700, width: 100, height: 40 }, CONTAINER);
    expect(placed.placement).toBe('above');
    expect(placed.offset).toBeGreaterThan(60);
  });

  it('centra la freccia sull’ancora senza uscire dal fumetto', () => {
    const middle = placeBubble({ x: 150, y: 100, width: 100, height: 40 }, CONTAINER);
    const left = placeBubble({ x: 0, y: 100, width: 20, height: 40 }, CONTAINER);
    const right = placeBubble({ x: 380, y: 100, width: 20, height: 40 }, CONTAINER);
    expect(middle.arrowX).toBe(200 - middle.left);
    expect(left.arrowX).toBeGreaterThan(0);
    expect(right.arrowX).toBeLessThan(CONTAINER.width - 2 * right.left);
  });
});

describe('holePath', () => {
  it('disegna il rettangolo dello schermo con un buco arrotondato (even-odd)', () => {
    const path = holePath(CONTAINER, { x: 10, y: 20, width: 100, height: 50 }, 12);
    expect(path.match(/M/g)).toHaveLength(2);
    expect(path).toContain('M0 0');
    expect(path).toContain('H400');
  });
});
