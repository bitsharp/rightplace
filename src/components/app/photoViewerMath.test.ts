import {
  clampScale,
  clampTranslation,
  doubleTapTarget,
  isZoomed,
  maxTranslation,
  pageIndexFromOffset,
  scaleAround,
  shouldDismissViewer,
} from './photoViewerMath';

const SIZE = { width: 400, height: 800 };

describe('clampScale', () => {
  it('tiene la scala tra 1× e 4×', () => {
    expect(clampScale(0.4)).toBe(1);
    expect(clampScale(2.5)).toBe(2.5);
    expect(clampScale(9)).toBe(4);
  });
});

describe('isZoomed', () => {
  it('considera ingrandita la foto solo oltre una piccola tolleranza', () => {
    expect(isZoomed(1)).toBe(false);
    expect(isZoomed(1.005)).toBe(false);
    expect(isZoomed(1.2)).toBe(true);
  });
});

describe('maxTranslation', () => {
  it('a 1× non si può spostare la foto', () => {
    expect(maxTranslation(SIZE, 1)).toEqual({ x: 0, y: 0 });
  });

  it('a 2× si può spostare di metà della dimensione in più, per lato', () => {
    expect(maxTranslation(SIZE, 2)).toEqual({ x: 200, y: 400 });
  });

  it('a 4× il limite cresce con la scala', () => {
    expect(maxTranslation(SIZE, 4)).toEqual({ x: 600, y: 1200 });
  });
});

describe('clampTranslation', () => {
  it('lascia invariato uno spostamento dentro i limiti', () => {
    expect(clampTranslation({ x: 50, y: -100 }, SIZE, 2)).toEqual({ x: 50, y: -100 });
  });

  it('riporta dentro i limiti uno spostamento eccessivo, nei due versi', () => {
    expect(clampTranslation({ x: 999, y: -999 }, SIZE, 2)).toEqual({ x: 200, y: -400 });
  });

  it('a 1× azzera lo spostamento', () => {
    expect(clampTranslation({ x: 30, y: 30 }, SIZE, 1)).toEqual({ x: 0, y: 0 });
  });
});

describe('scaleAround', () => {
  it('ingrandire attorno al centro non sposta la foto', () => {
    expect(scaleAround({ x: 0, y: 0 }, 1, 2, { x: 0, y: 0 }, SIZE)).toEqual({ x: 0, y: 0 });
  });

  it('ingrandire attorno a un punto a destra del centro sposta la foto a sinistra, per tenerlo fermo', () => {
    // il punto 100 px a destra del centro (relativo) resta sotto il dito
    expect(scaleAround({ x: 0, y: 0 }, 1, 2, { x: 100, y: 0 }, SIZE)).toEqual({ x: -100, y: 0 });
  });

  it('non esce mai dai limiti della nuova scala', () => {
    const next = scaleAround({ x: 0, y: 0 }, 1, 2, { x: 200, y: 400 }, SIZE);
    expect(next).toEqual({ x: -200, y: -400 });
    const far = scaleAround({ x: 0, y: 0 }, 1, 2, { x: 900, y: 900 }, SIZE);
    expect(far).toEqual({ x: -200, y: -400 });
  });

  it('tornando a 1× la foto si ricentra', () => {
    expect(scaleAround({ x: 120, y: -80 }, 2, 1, { x: 30, y: 30 }, SIZE)).toEqual({ x: 0, y: 0 });
  });
});

describe('doubleTapTarget', () => {
  it('da non ingrandita porta a 2× attorno al punto toccato', () => {
    expect(doubleTapTarget(1)).toBe(2);
  });

  it('da ingrandita (anche poco) torna a 1×', () => {
    expect(doubleTapTarget(2)).toBe(1);
    expect(doubleTapTarget(1.3)).toBe(1);
    expect(doubleTapTarget(4)).toBe(1);
  });
});

describe('shouldDismissViewer', () => {
  it('chiude con un trascinamento lungo, in su o in giù', () => {
    expect(shouldDismissViewer({ translationY: 200, velocityY: 0, height: 800 })).toBe(true);
    expect(shouldDismissViewer({ translationY: -200, velocityY: 0, height: 800 })).toBe(true);
  });

  it('chiude con uno scatto veloce anche se corto', () => {
    expect(shouldDismissViewer({ translationY: 30, velocityY: 1800, height: 800 })).toBe(true);
  });

  it('non chiude con un trascinamento corto e lento', () => {
    expect(shouldDismissViewer({ translationY: 40, velocityY: 100, height: 800 })).toBe(false);
  });
});

describe('pageIndexFromOffset', () => {
  it('arrotonda alla pagina più vicina e resta nei limiti', () => {
    expect(pageIndexFromOffset(0, 400, 5)).toBe(0);
    expect(pageIndexFromOffset(610, 400, 5)).toBe(2);
    expect(pageIndexFromOffset(9999, 400, 5)).toBe(4);
    expect(pageIndexFromOffset(-30, 400, 5)).toBe(0);
  });

  it('con larghezza zero resta alla prima pagina', () => {
    expect(pageIndexFromOffset(100, 0, 5)).toBe(0);
  });
});
