import { routeForNotification } from './deepLink';

describe('routeForNotification', () => {
  it.each([
    ['rightplace://night/abc-123/chat', '/night/abc-123/chat'],
    ['rightplace://post/new', '/post/new'],
    ['rightplace://post/9f1c-22ab', '/post/9f1c-22ab'],
    ['rightplace://feed', '/feed'],
    ['rightplace://creator', '/creator'],
    ['rightplace://friends/requests', '/friends'],
    ['rightplace://u/volpe.viola', '/u/volpe.viola'],
    ['rightplace://u/luca_97', '/u/luca_97'],
    ['rightplace://chat', '/chat'],
    ['rightplace://map', '/map'],
    ['rightplace://support/feedback', '/support/feedback'],
    ['rightplace://dm/9f1c-22ab', '/dm/9f1c-22ab'],
  ])('%s apre %s', (url, route) => {
    expect(routeForNotification(url)).toBe(route);
  });

  it('un URL sconosciuto o malformato apre la mappa', () => {
    expect(routeForNotification('rightplace://boh/boh')).toBe('/map');
    expect(routeForNotification('https://example.com/feed')).toBe('/map');
    expect(routeForNotification('rightplace://night/../chat')).toBe('/map');
    expect(routeForNotification('rightplace://u/NON VALIDO')).toBe('/map');
    expect(routeForNotification('rightplace://post/../x')).toBe('/map');
    expect(routeForNotification('rightplace://post/a/b')).toBe('/map');
    expect(routeForNotification('rightplace://dm/../x')).toBe('/map');
    expect(routeForNotification('rightplace://dm/a/b')).toBe('/map');
    expect(routeForNotification('')).toBe('/map');
    expect(routeForNotification(null)).toBe('/map');
    expect(routeForNotification(undefined)).toBe('/map');
  });
});
