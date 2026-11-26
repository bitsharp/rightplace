export type TourScreen = 'map' | 'venue' | 'chat' | 'friends' | 'userProfile';

export type TourStepId =
  | 'map.viewToggle'
  | 'map.hotSpot'
  | 'topbar.plus'
  | 'venue.declare'
  | 'venue.bands'
  | 'chat.night'
  | 'friends.search'
  | 'profile.message';

export type TourStep = { id: TourStepId; screen: TourScreen };

// Order matters: within a screen the tips appear in this order, one at a time. The "+" of the top bar
// is declared on the map because that is where the user lands after declaring the night.
export const TOUR_STEPS: readonly TourStep[] = [
  { id: 'map.viewToggle', screen: 'map' },
  { id: 'map.hotSpot', screen: 'map' },
  { id: 'topbar.plus', screen: 'map' },
  { id: 'venue.declare', screen: 'venue' },
  { id: 'venue.bands', screen: 'venue' },
  { id: 'chat.night', screen: 'chat' },
  { id: 'friends.search', screen: 'friends' },
  { id: 'profile.message', screen: 'userProfile' },
];

const STEP_IDS: ReadonlySet<string> = new Set(TOUR_STEPS.map((step) => step.id));

export function isTourStepId(value: unknown): value is TourStepId {
  return typeof value === 'string' && STEP_IDS.has(value);
}

// The first tip of the screen the user has not seen yet, or null when there is nothing left to show.
export function nextStep(screen: TourScreen, seen: readonly TourStepId[]): TourStepId | null {
  const next = TOUR_STEPS.find((step) => step.screen === screen && !seen.includes(step.id));
  return next?.id ?? null;
}

// Like nextStep, but a tip whose anchor is not on screen (e.g. the "+" before declaring) waits its turn
// instead of blocking the ones after it.
export function nextVisibleStep(
  screen: TourScreen,
  seen: readonly TourStepId[],
  isAnchored: (id: TourStepId) => boolean,
): TourStepId | null {
  const passed = [...seen];
  for (;;) {
    const id = nextStep(screen, passed);
    if (id === null || isAnchored(id)) return id;
    passed.push(id);
  }
}
