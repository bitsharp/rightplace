import { z } from 'zod';

const envSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.url({ protocol: /^https$/ }),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  EXPO_PUBLIC_TURNSTILE_SITE_KEY: z.string().optional(),
  EXPO_PUBLIC_CREATOR_ENABLED: z.enum(['true', 'false', '1', '0', '']).optional(),
});

export type Env = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  // null until Cloudflare is set up: the captcha box is then hidden and Supabase must not require it
  turnstileSiteKey: string | null;
  // UI-only switch: off in tester builds to hide the creator area (the backend is untouched)
  creatorEnabled: boolean;
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
    turnstileSiteKey: result.data.EXPO_PUBLIC_TURNSTILE_SITE_KEY || null,
    creatorEnabled: ['true', '1'].includes(result.data.EXPO_PUBLIC_CREATOR_ENABLED ?? ''),
  };
}

// Expo inlines EXPO_PUBLIC_* only on static `process.env.NAME` access, so each key is listed explicitly.
export const loadEnv = (): Env =>
  parseEnv({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_TURNSTILE_SITE_KEY: process.env.EXPO_PUBLIC_TURNSTILE_SITE_KEY,
    EXPO_PUBLIC_CREATOR_ENABLED: process.env.EXPO_PUBLIC_CREATOR_ENABLED,
  });
