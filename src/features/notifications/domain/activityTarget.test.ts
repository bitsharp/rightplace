import { activityRoute } from './activityTarget';

const base = { actorHandle: 'volpe.viola', postId: 'p1', commentId: null };

describe('activityRoute', () => {
  it('un like porta al post (con l’elenco di chi ha messo like)', () => {
    expect(activityRoute({ ...base, kind: 'like' })).toBe('/post/p1');
  });

  it('un commento porta al post con i commenti aperti sul commento', () => {
    expect(activityRoute({ ...base, kind: 'comment', commentId: 'c9' })).toBe(
      '/post/p1?comments=1&comment=c9',
    );
  });

  it('un commento senza id (database non aggiornato) apre comunque i commenti', () => {
    expect(activityRoute({ ...base, kind: 'comment' })).toBe('/post/p1?comments=1');
  });

  it('senza id del post, like e commenti portano al feed', () => {
    expect(activityRoute({ ...base, kind: 'like', postId: null })).toBe('/feed');
    expect(activityRoute({ ...base, kind: 'comment', postId: null })).toBe('/feed');
  });

  it('le richieste portano alle richieste (nella tab Amici)', () => {
    expect(activityRoute({ ...base, kind: 'follow_request', postId: null })).toBe('/friends');
  });

  it('una richiesta accettata porta al profilo di chi ha accettato', () => {
    expect(
      activityRoute({ ...base, kind: 'follow_accepted', postId: null, actorHandle: 'orso.grigio' }),
    ).toBe('/u/orso.grigio');
  });
});
