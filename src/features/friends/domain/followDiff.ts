// The first load has nothing to compare with: it is not "newly accepted", just the starting list.
export function newlyAccepted(
  previous: readonly string[] | undefined,
  next: readonly string[],
): string[] {
  if (!previous) return [];
  const known = new Set(previous);
  return next.filter((id) => !known.has(id));
}
