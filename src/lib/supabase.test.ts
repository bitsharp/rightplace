import { createClient } from '@supabase/supabase-js';

jest.unmock('@/lib/supabase');
jest.mock('@supabase/supabase-js', () => ({ createClient: jest.fn(() => ({ auth: {} })) }));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('./env', () => ({
  loadEnv: () => ({
    supabaseUrl: 'https://abcd.supabase.co',
    supabaseAnonKey: 'anon',
    turnstileSiteKey: null,
  }),
}));

describe('supabase client', () => {
  it('usa la anon key, salva la sessione in SecureStore e non legge la sessione dagli URL', () => {
    jest.isolateModules(() => {
      jest.requireActual('./supabase');
    });
    const [url, key, options] = jest.mocked(createClient).mock.calls[0] ?? [];
    expect(url).toBe('https://abcd.supabase.co');
    expect(key).toBe('anon');
    expect(options?.auth).toMatchObject({
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: 'pkce',
    });
    expect(options?.auth?.storage).toEqual(
      expect.objectContaining({ getItem: expect.any(Function), setItem: expect.any(Function) }),
    );
  });
});
