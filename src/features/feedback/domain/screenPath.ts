// Privacy: the path sent to support never carries ids or handles (another user's handle in /u/<handle>).
const DYNAMIC_PARENTS = new Set(['venue', 'event', 'edit-event', 'night', 'story', 'u']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_LENGTH = 200;

function isIdLike(segment: string): boolean {
  return UUID.test(segment) || /^\d+$/.test(segment);
}

export function normalizeScreenPath(pathname: string): string {
  const path = pathname.split(/[?#]/)[0] ?? '';
  const segments = path.split('/').filter((segment) => segment !== '');
  const normalized = segments.map((segment, index) =>
    isIdLike(segment) || DYNAMIC_PARENTS.has(segments[index - 1] ?? '') ? '[id]' : segment,
  );
  return `/${normalized.join('/')}`.slice(0, MAX_LENGTH);
}
