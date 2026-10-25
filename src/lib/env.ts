import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https$/ }),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type Env = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

export function parseEnv(raw: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(raw);
  if (!result.success) {
    const invalid = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Variabili d'ambiente non valide: ${invalid}. Vedi .env.example`);
  }
  return {
    supabaseUrl: result.data.EXPO_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: result.data.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  };
}

// Expo inlines EXPO_PUBLIC_* only on static `process.env.NAME` access, so each key is listed explicitly.
export const loadEnv = (): Env =>
  parseEnv({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  });
