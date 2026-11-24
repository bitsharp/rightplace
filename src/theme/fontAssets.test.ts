import { FONT_ASSETS } from './fontAssets';
import { fonts } from './tokens';

describe('FONT_ASSETS', () => {
  it('carica ogni famiglia dichiarata nei token, così nessun testo ricade sul font di sistema', () => {
    for (const family of Object.values(fonts)) {
      expect(Object.keys(FONT_ASSETS)).toContain(family);
    }
  });

  it('carica Barlow Condensed ExtraBold Italic e Bold per i titoli', () => {
    expect(fonts.display).toBe('BarlowCondensed_800ExtraBold_Italic');
    expect(fonts.displayUpright).toBe('BarlowCondensed_700Bold');
  });
});
