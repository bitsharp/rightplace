import { settingsGroups, type SettingsGroup } from './settingsRows';

const base = { creatorEnabled: false, isCreator: false, isSupport: false };
const keys = (groups: SettingsGroup[], group: string) =>
  groups.find((candidate) => candidate.key === group)?.rows.map((row) => row.key);

describe('settingsGroups', () => {
  it('raggruppa le voci in account, aiuto e informazioni', () => {
    expect(settingsGroups(base).map((group) => group.key)).toEqual(['account', 'help', 'info']);
  });

  it('nell’account elenca lingua, notifiche, privacy, città, @tag, dati personali e password', () => {
    expect(keys(settingsGroups(base), 'account')).toEqual([
      'language',
      'notifications',
      'privacy',
      'city',
      'tag',
      'personal',
      'password',
    ]);
  });

  it('con l’area creator attiva aggiunge la voce creator: "Diventa creator" per chi non lo è', () => {
    const rows = settingsGroups({ ...base, creatorEnabled: true })[0]?.rows ?? [];
    expect(rows.find((row) => row.key === 'creator')?.titleKey).toBe('app.becomeCreator');
  });

  it('con l’area creator attiva, a un creator propone "Il tuo profilo creator"', () => {
    const rows = settingsGroups({ ...base, creatorEnabled: true, isCreator: true })[0]?.rows ?? [];
    expect(rows.find((row) => row.key === 'creator')?.titleKey).toBe('app.creatorProfile');
  });

  it('con l’area creator spenta non mostra la voce, nemmeno a un creator', () => {
    expect(keys(settingsGroups({ ...base, isCreator: true }), 'account')).not.toContain('creator');
  });

  it('i feedback ricevuti compaiono solo per il supporto', () => {
    expect(keys(settingsGroups(base), 'help')).toEqual(['feedback']);
    expect(keys(settingsGroups({ ...base, isSupport: true }), 'help')).toEqual([
      'feedback',
      'supportFeedback',
    ]);
  });

  it('in informazioni ci sono chi siamo, termini e privacy policy', () => {
    expect(keys(settingsGroups(base), 'info')).toEqual(['about', 'terms', 'privacyPolicy']);
  });

  it('ogni voce ha una destinazione: una rotta o il feedback', () => {
    const rows = settingsGroups({ creatorEnabled: true, isCreator: true, isSupport: true }).flatMap(
      (group) => group.rows,
    );
    expect(rows.every((row) => row.target === 'feedback' || row.target.startsWith('/'))).toBe(true);
  });
});
