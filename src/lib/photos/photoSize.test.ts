import { resizeTarget } from './photoSize';

describe('resizeTarget', () => {
  it('porta il lato lungo a 1280 mantenendo le proporzioni (orizzontale)', () => {
    expect(resizeTarget(4032, 3024)).toEqual({ width: 1280, height: 960 });
  });

  it('vale anche per le foto verticali', () => {
    expect(resizeTarget(3024, 4032)).toEqual({ width: 960, height: 1280 });
  });

  it('non ingrandisce mai una foto già piccola', () => {
    expect(resizeTarget(800, 600)).toEqual({ width: 800, height: 600 });
    expect(resizeTarget(1280, 720)).toEqual({ width: 1280, height: 720 });
  });

  it('rispetta un massimo diverso e arrotonda ai pixel interi', () => {
    expect(resizeTarget(1000, 333, 500)).toEqual({ width: 500, height: 167 });
  });
});
