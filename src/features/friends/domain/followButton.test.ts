import { followButtonState } from './followButton';

describe('followButtonState', () => {
  it('senza follow propone di richiedere', () => {
    expect(followButtonState('none', false)).toEqual({
      action: 'request',
      labelKey: 'follow.request',
      a11yKey: 'follow.a11yRequest',
      showFollowsYou: false,
    });
  });

  it('con richiesta pending il tap la ritira', () => {
    expect(followButtonState('pending', false)).toMatchObject({
      action: 'cancel',
      labelKey: 'follow.requested',
      a11yKey: 'follow.a11yCancel',
    });
  });

  it('con follow accettato il tap smette di seguire', () => {
    expect(followButtonState('accepted', false)).toMatchObject({
      action: 'unfollow',
      labelKey: 'follow.following',
      a11yKey: 'follow.a11yUnfollow',
    });
  });

  it('mostra "Ti segue" solo se lui mi segue e io non ho ancora fatto nulla', () => {
    expect(followButtonState('none', true).showFollowsYou).toBe(true);
    expect(followButtonState('pending', true).showFollowsYou).toBe(false);
    expect(followButtonState('accepted', true).showFollowsYou).toBe(false);
  });
});
