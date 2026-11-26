import { nextVisibleStep } from './steps';

describe('nextVisibleStep', () => {
  it('salta i fumetti la cui ancora non c’è e aspetta che compaia', () => {
    const anchored = (id: string) => id !== 'venue.declare';
    expect(nextVisibleStep('venue', [], anchored)).toBe('venue.bands');
  });

  it('restituisce null se nessun fumetto non visto ha l’ancora', () => {
    expect(nextVisibleStep('venue', [], () => false)).toBeNull();
    expect(nextVisibleStep('venue', ['venue.declare', 'venue.bands'], () => true)).toBeNull();
  });

  it('con tutte le ancore presenti segue l’ordine di nextStep', () => {
    expect(nextVisibleStep('map', ['map.viewToggle'], () => true)).toBe('map.hotSpot');
  });
});
