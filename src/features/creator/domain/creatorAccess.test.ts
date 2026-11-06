import { creatorUi } from './creatorAccess';

describe('creatorUi', () => {
  it('con flag spento nasconde tutto', () => {
    expect(creatorUi(false)).toEqual({
      showCreatorToggle: false,
      showCreatorProfileLink: false,
      canOpenCreatorRoutes: false,
    });
  });

  it('con flag acceso mostra tutto', () => {
    expect(creatorUi(true)).toEqual({
      showCreatorToggle: true,
      showCreatorProfileLink: true,
      canOpenCreatorRoutes: true,
    });
  });
});
