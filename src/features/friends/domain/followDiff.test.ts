import { newlyAccepted } from './followDiff';

describe('newlyAccepted', () => {
  it('restituisce gli id comparsi tra i seguiti', () => {
    expect(newlyAccepted(['a', 'b'], ['a', 'b', 'c'])).toEqual(['c']);
  });

  it('non segnala chi è sparito o è rimasto', () => {
    expect(newlyAccepted(['a', 'b'], ['a'])).toEqual([]);
  });

  it('al primo caricamento non segnala nulla', () => {
    expect(newlyAccepted(undefined, ['a', 'b'])).toEqual([]);
  });
});
