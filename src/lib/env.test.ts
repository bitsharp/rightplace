import { parseEnv } from './env';

const validRaw = {
  EXPO_PUBLIC_SUPABASE_URL: 'https://abcd.supabase.co',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
};

describe('parseEnv', () => {
  it('restituisce la configurazione tipizzata quando le variabili sono valide', () => {
    expect(parseEnv(validRaw)).toEqual({
      supabaseUrl: 'https://abcd.supabase.co',
      supabaseAnonKey: 'anon-key',
    });
  });

  it('rifiuta un URL Supabase non valido', () => {
    expect(() => parseEnv({ ...validRaw, EXPO_PUBLIC_SUPABASE_URL: 'non-un-url' })).toThrow(
      /EXPO_PUBLIC_SUPABASE_URL/,
    );
  });

  it('rifiuta un URL Supabase non https', () => {
    expect(() =>
      parseEnv({ ...validRaw, EXPO_PUBLIC_SUPABASE_URL: 'http://abcd.supabase.co' }),
    ).toThrow(/EXPO_PUBLIC_SUPABASE_URL/);
  });

  it('rifiuta una anon key mancante o vuota', () => {
    expect(() => parseEnv({ ...validRaw, EXPO_PUBLIC_SUPABASE_ANON_KEY: '' })).toThrow(
      /EXPO_PUBLIC_SUPABASE_ANON_KEY/,
    );
    expect(() => parseEnv({ EXPO_PUBLIC_SUPABASE_URL: validRaw.EXPO_PUBLIC_SUPABASE_URL })).toThrow(
      /EXPO_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });

  it('elenca tutte le variabili non valide in un solo errore', () => {
    expect(() => parseEnv({})).toThrow(
      /EXPO_PUBLIC_SUPABASE_URL[\s\S]*EXPO_PUBLIC_SUPABASE_ANON_KEY/,
    );
  });
});
