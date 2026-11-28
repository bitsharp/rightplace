import { settingsGroups, type SettingsGroup } from './settingsRows';

const base = { creatorEnabled: false, isCreator: false, isSupport: false, isAdmin: false };
const keys = (groups: SettingsGroup[], group: string) =>
  groups.find((candidate) => candidate.key === group)?.rows.map((row) => row.key);

describe('settingsGroups', () => {
  it('raggruppa le voci in account, aiuto e informazioni', () => {
    expect(settingsGroups(base).map((group) => group.key)).toEqual(['account', 'help', 'info']);
  });

  it('nell’account elenca lingua, notifiche, privacy, città, mappa all’avvio, @tag, dati personali e password', () => {
    expect(keys(settingsGroups(base), 'account')).toEqual([
      'language',
      'notifications',
      'privacy',
      'city',
      'mapView',
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
    expect(keys(settingsGroups(base), 'help')).toEqual(['howItWorks', 'feedback']);
    expect(keys(settingsGroups({ ...base, isSupport: true }), 'help')).toEqual([
      'howItWorks',
      'feedback',
      'supportFeedback',
    ]);
  });

  it('"Utilizzo app" compare solo per l’amministratore e apre la schermata admin', () => {
    expect(keys(settingsGroups(base), 'help')).not.toContain('usageLog');
    const rows = settingsGroups({ ...base, isAdmin: true }).flatMap((group) => group.rows);
    expect(rows.find((row) => row.key === 'usageLog')).toMatchObject({
      titleKey: 'app.usageLog',
      target: '/admin/usage',
    });
  });

  it('“Come funziona” è la prima voce di aiuto, prima del feedback', () => {
    const help = settingsGroups(base).find((group) => group.key === 'help');
    expect(help?.rows[0]).toMatchObject({
      key: 'howItWorks',
      titleKey: 'settings.rows.howItWorks',
      target: 'tour',
    });
  });

  it('in informazioni ci sono chi siamo, termini e privacy policy', () => {
    expect(keys(settingsGroups(base), 'info')).toEqual(['about', 'terms', 'privacyPolicy']);
  });

  it('ogni voce ha una destinazione: una rotta, il feedback o la guida', () => {
    const rows = settingsGroups({
      creatorEnabled: true,
      isCreator: true,
      isSupport: true,
      isAdmin: true,
    }).flatMap((group) => group.rows);
    expect(
      rows.every(
        (row) => row.target === 'feedback' || row.target === 'tour' || row.target.startsWith('/'),
      ),
    ).toBe(true);
  });
});
