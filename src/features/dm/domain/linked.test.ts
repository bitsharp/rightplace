import { canMessage } from './linked';

describe('canMessage', () => {
  it('serve un follow accettato in una delle due direzioni', () => {
    expect(canMessage({ followState: 'accepted', followsMe: false })).toBe(true);
    expect(canMessage({ followState: 'none', followsMe: true })).toBe(true);
  });

  it('una richiesta in attesa o nessun legame non bastano', () => {
    expect(canMessage({ followState: 'pending', followsMe: false })).toBe(false);
    expect(canMessage({ followState: 'none', followsMe: false })).toBe(false);
  });
});
