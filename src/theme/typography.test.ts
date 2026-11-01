import { typography } from './typography';

describe('typography', () => {
  it('usa Unbounded per i titoli nelle misure del mock-up', () => {
    expect(typography.display30).toMatchObject({ fontFamily: 'Unbounded_700Bold', fontSize: 30 });
    expect(typography.display17).toMatchObject({ fontFamily: 'Unbounded_700Bold', fontSize: 17 });
  });

  it('usa Inter per il testo', () => {
    expect(typography.body15).toMatchObject({ fontFamily: 'Inter_400Regular', fontSize: 15 });
    expect(typography.body15Strong).toMatchObject({
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
    });
  });

  it('usa Space Mono con letter-spacing per le label', () => {
    expect(typography.label10).toMatchObject({
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 10,
      letterSpacing: 1.2,
    });
    expect(typography.label12).toMatchObject({ fontSize: 12, letterSpacing: 1.5 });
  });
});
