import { fromTargetArrays, toTargetArrays, type AgeChip, type GenderChip } from './target';

describe('toTargetArrays', () => {
  it('nessuna età e "Tutti" significano nessun filtro: array vuoti', () => {
    expect(toTargetArrays([], 'all')).toEqual({ ageBands: [], genders: [] });
  });

  it('"35+" copre le due fasce del database: 35-44 e 45+', () => {
    expect(toTargetArrays(['35+'], 'all').ageBands).toEqual(['35-44', '45+']);
  });

  it('unisce più chip in ordine stabile, senza doppioni', () => {
    const ages: AgeChip[] = ['35+', '18-24'];
    expect(toTargetArrays(ages, 'all').ageBands).toEqual(['18-24', '35-44', '45+']);
  });

  it('traduce il genere', () => {
    expect(toTargetArrays([], 'female').genders).toEqual(['female']);
    expect(toTargetArrays([], 'male').genders).toEqual(['male']);
  });
});

describe('fromTargetArrays', () => {
  it('è l’inverso di toTargetArrays', () => {
    const cases: [AgeChip[], GenderChip][] = [
      [[], 'all'],
      [['18-24', '25-34'], 'female'],
      [['35+'], 'male'],
      [['18-24', '25-34', '35+'], 'all'],
    ];
    for (const [ages, gender] of cases) {
      const { ageBands, genders } = toTargetArrays(ages, gender);
      expect(fromTargetArrays(ageBands, genders)).toEqual({ ages, gender });
    }
  });

  it('una sola metà di "35+" non basta ad accendere il chip', () => {
    expect(fromTargetArrays(['35-44'], []).ages).toEqual([]);
  });

  it('più generi (o "other") non sono rappresentabili dai chip: tornano a "Tutti"', () => {
    expect(fromTargetArrays([], ['female', 'male']).gender).toBe('all');
    expect(fromTargetArrays([], ['other']).gender).toBe('all');
  });
});

describe('fromTargetArrays (etichetta di una serata)', () => {
  it('senza età né genere i chip sono vuoti: la UI scrive "Tutti"', () => {
    expect(fromTargetArrays([], [])).toEqual({ ages: [], gender: 'all' });
  });

  it('"35+" compare una volta sola anche se il database ha due fasce', () => {
    expect(fromTargetArrays(['35-44', '45+'], ['female'])).toEqual({
      ages: ['35+'],
      gender: 'female',
    });
  });
});
