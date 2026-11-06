export type CreatorUi = {
  showCreatorToggle: boolean;
  showCreatorProfileLink: boolean;
  canOpenCreatorRoutes: boolean;
};

// UI-only gate: with the flag off the creator area is invisible to everyone, even to existing
// creators (so is_creator is not an input); their data and the server rules stay as they are.
export function creatorUi(flag: boolean): CreatorUi {
  return {
    showCreatorToggle: flag,
    showCreatorProfileLink: flag,
    canOpenCreatorRoutes: flag,
  };
}
