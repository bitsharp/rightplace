import { TOUR_STEPS } from '@/features/tour/domain/steps';
import { resetTourStore, useTourStore } from '@/features/tour/store/tourStore';

// The guide (welcome + tips) is the first-time experience: every other suite runs as a user who has
// already seen it, so it never covers the screens under test. Suites about the guide call markTourUnseen().
export function markTourSeen(): void {
  useTourStore.setState({ welcomeSeen: true, seenSteps: TOUR_STEPS.map((step) => step.id) });
}

export function markTourUnseen(): void {
  resetTourStore();
}
