import { avatarIntent } from './avatarColor';

const HANDLES = [
  'volpe.viola',
  'gatto.blu',
  'lupo.verde',
  'panda.rosa',
  'falco.nero',
  'orso.grigio',
  'civetta.oro',
  'delfino.cyan',
  'lince.rosso',
  'tigre.giallo',
];

describe('avatarIntent', () => {
  it('è deterministico per lo stesso handle', () => {
    expect(avatarIntent('volpe.viola')).toBe(avatarIntent('volpe.viola'));
  });

  it('ignora la @ iniziale', () => {
    expect(avatarIntent('@volpe.viola')).toBe(avatarIntent('volpe.viola'));
  });

  it('usa solo i colori del design system', () => {
    HANDLES.forEach((handle) => {
      expect(['going', 'maybe', 'neutral']).toContain(avatarIntent(handle));
    });
  });

  it('distribuisce gli handle su più colori', () => {
    expect(new Set(HANDLES.map(avatarIntent)).size).toBeGreaterThan(1);
  });
});
