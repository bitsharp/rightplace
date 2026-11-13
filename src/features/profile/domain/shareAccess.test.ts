import { shareUi } from './shareAccess';

describe('shareUi', () => {
  it('con flag spento nasconde la condivisione del @tag', () => {
    expect(shareUi(false)).toEqual({ showShareHandle: false });
  });

  it('con flag acceso la mostra', () => {
    expect(shareUi(true)).toEqual({ showShareHandle: true });
  });
});
