const SCHEME = 'rightplace://';
const FALLBACK = '/map';
const ID = /^[A-Za-z0-9-]+$/;
const HANDLE = /^[a-z]+\.[a-z]+[0-9]*$/;

const STATIC_ROUTES: Record<string, string> = {
  'post/new': '/post/new',
  feed: '/feed',
  creator: '/creator',
  // follow requests live inside the Friends tab
  'friends/requests': '/friends',
  chat: '/chat',
  map: '/map',
};

// Notification URLs come from the server (or from outside): anything not recognised opens the map.
export function routeForNotification(url: string | null | undefined): string {
  if (!url?.startsWith(SCHEME)) return FALLBACK;
  const path = url.slice(SCHEME.length);
  const fixed = STATIC_ROUTES[path];
  if (fixed) return fixed;
  const [first, id, last, ...extra] = path.split('/');
  if (extra.length > 0) return FALLBACK;
  if (first === 'night' && last === 'chat' && id && ID.test(id)) return `/night/${id}/chat`;
  if (first === 'u' && id && last === undefined && HANDLE.test(id)) return `/u/${id}`;
  return FALLBACK;
}
