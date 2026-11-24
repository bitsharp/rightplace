import { splitTitle } from './mapTitle';

describe('splitTitle', () => {
  it('separa la città, che sarà in viola, dal resto del titolo', () => {
    expect(splitTitle('STASERA Milano', 'Milano')).toEqual({ lead: 'STASERA', city: 'Milano' });
  });

  it('funziona anche con città di più parole', () => {
    expect(splitTitle('TONIGHT Las Palmas', 'Las Palmas')).toEqual({
      lead: 'TONIGHT',
      city: 'Las Palmas',
    });
  });

  it('se la città non compare nel titolo lo lascia tutto com’è', () => {
    expect(splitTitle('STASERA', 'Milano')).toEqual({ lead: 'STASERA', city: '' });
  });
});
