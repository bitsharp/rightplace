const WEB_BASE = 'https://rightplace.app/u/';
const APP_BASE = 'rightplace://u/';

// The handle is the only public identity (principle 1): the links carry nothing else.
export function shareLinks(handle: string): { app: string; web: string } {
  const name = handle.replace(/^@/, '');
  return { app: `${APP_BASE}${name}`, web: `${WEB_BASE}${name}` };
}
