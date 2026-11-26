import { nextStep, TOUR_STEPS, type TourStepId } from './steps';

describe('nextStep', () => {
  it('restituisce il primo fumetto non visto della schermata, nell’ordine del piano', () => {
    expect(nextStep('map', [])).toBe('map.viewToggle');
    expect(nextStep('map', ['map.viewToggle'])).toBe('map.hotSpot');
    expect(nextStep('map', ['map.viewToggle', 'map.hotSpot'])).toBe('topbar.plus');
  });

  it('salta i fumetti già visti anche se non sono in ordine', () => {
    expect(nextStep('map', ['map.hotSpot'])).toBe('map.viewToggle');
    expect(nextStep('venue', ['venue.declare'])).toBe('venue.bands');
  });

  it('restituisce null quando tutti i fumetti della schermata sono stati visti', () => {
    expect(nextStep('venue', ['venue.declare', 'venue.bands'])).toBeNull();
  });

  it('non guarda i fumetti delle altre schermate', () => {
    expect(nextStep('chat', ['map.viewToggle'])).toBe('chat.night');
  });

  it('ogni fumetto appartiene a una sola schermata ed esiste una volta sola', () => {
    const ids: TourStepId[] = TOUR_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
