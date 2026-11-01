import { formatHandle } from './handle';

describe('formatHandle', () => {
  it('aggiunge la @ quando manca', () => {
    expect(formatHandle('lince.rosso')).toBe('@lince.rosso');
  });

  it('non la raddoppia quando c’è già', () => {
    expect(formatHandle('@lince.rosso')).toBe('@lince.rosso');
  });
});
