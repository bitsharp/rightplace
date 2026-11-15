import { deriveSessionStatus } from './sessionStatus';

describe('deriveSessionStatus', () => {
  it('è loading finché la sessione salvata non è stata letta', () => {
    expect(deriveSessionStatus({ initialized: false, session: null, profile: undefined })).toBe(
      'loading',
    );
  });

  it('è signedOut senza sessione', () => {
    expect(deriveSessionStatus({ initialized: true, session: null, profile: undefined })).toBe(
      'signedOut',
    );
  });

  it('è unverified con email non confermata', () => {
    expect(
      deriveSessionStatus({
        initialized: true,
        session: { emailConfirmed: false },
        profile: undefined,
      }),
    ).toBe('unverified');
  });

  it('è loading mentre il profilo viene caricato', () => {
    expect(
      deriveSessionStatus({
        initialized: true,
        session: { emailConfirmed: true },
        profile: undefined,
      }),
    ).toBe('loading');
  });

  it('è needsProfile se mancano i dati privati', () => {
    expect(
      deriveSessionStatus({
        initialized: true,
        session: { emailConfirmed: true },
        profile: { birthDate: null, handleConfirmedAt: null, deleted: false },
      }),
    ).toBe('needsProfile');
  });

  it('è needsHandle se il profilo è completo ma il @tag non è ancora confermato', () => {
    expect(
      deriveSessionStatus({
        initialized: true,
        session: { emailConfirmed: true },
        profile: { birthDate: '2000-01-01', handleConfirmedAt: null, deleted: false },
      }),
    ).toBe('needsHandle');
  });

  it('è ready con il profilo completo', () => {
    expect(
      deriveSessionStatus({
        initialized: true,
        session: { emailConfirmed: true },
        profile: {
          birthDate: '2000-01-01',
          handleConfirmedAt: '2026-11-01T10:00:00Z',
          deleted: false,
        },
      }),
    ).toBe('ready');
  });

  it('torna signedOut se l’account è in cancellazione o il profilo manca', () => {
    expect(
      deriveSessionStatus({
        initialized: true,
        session: { emailConfirmed: true },
        profile: { birthDate: null, handleConfirmedAt: null, deleted: true },
      }),
    ).toBe('signedOut');
    expect(
      deriveSessionStatus({ initialized: true, session: { emailConfirmed: true }, profile: null }),
    ).toBe('signedOut');
  });
});
