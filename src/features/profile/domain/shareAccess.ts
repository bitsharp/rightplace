export type ShareUi = { showShareHandle: boolean };

// UI-only gate: the share message carries a web link that answers 404 until the domain is live,
// so with the flag off the button does not exist; the code stays, ready for the day it is turned on.
export function shareUi(flag: boolean): ShareUi {
  return { showShareHandle: flag };
}
