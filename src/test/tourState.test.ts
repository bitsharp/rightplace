import { TOUR_STEPS } from '@/features/tour/domain/steps';
import { useTourStore } from '@/features/tour/store/tourStore';

import { markTourSeen, markTourUnseen } from './tourState';

describe('tourState helpers', () => {
  it('le suite partono con la guida già vista', () => {
    expect(useTourStore.getState().welcomeSeen).toBe(true);
    expect(useTourStore.getState().seenSteps).toHaveLength(TOUR_STEPS.length);
  });

  it('markTourUnseen simula la prima volta e markTourSeen la annulla', () => {
    markTourUnseen();
    expect(useTourStore.getState()).toMatchObject({ welcomeSeen: false, seenSteps: [] });
    markTourSeen();
    expect(useTourStore.getState().welcomeSeen).toBe(true);
  });
});
