import { activityRoute } from './activityTarget';

describe('activityRoute', () => {
  it('like e commenti portano al feed', () => {
    expect(activityRoute({ kind: 'like', actorHandle: 'volpe.viola' })).toBe('/feed');
    expect(activityRoute({ kind: 'comment', actorHandle: 'volpe.viola' })).toBe('/feed');
  });

  it('le richieste portano alle richieste (nella tab Amici)', () => {
    expect(activityRoute({ kind: 'follow_request', actorHandle: 'volpe.viola' })).toBe('/friends');
  });

  it('una richiesta accettata porta al profilo di chi ha accettato', () => {
    expect(activityRoute({ kind: 'follow_accepted', actorHandle: 'orso.grigio' })).toBe(
      '/u/orso.grigio',
    );
  });
});
