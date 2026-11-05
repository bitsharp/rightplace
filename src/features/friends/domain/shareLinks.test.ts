import { shareLinks } from './shareLinks';

describe('shareLinks', () => {
  it('costruisce il link dell’app e quello web con l’handle', () => {
    expect(shareLinks('lince.rosso')).toEqual({
      app: 'rightplace://u/lince.rosso',
      web: 'https://rightplace.app/u/lince.rosso',
    });
  });

  it('ignora la @ iniziale', () => {
    expect(shareLinks('@lince.rosso').app).toBe('rightplace://u/lince.rosso');
  });
});
