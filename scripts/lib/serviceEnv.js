// Variables for the maintainer's CLI scripts. They hold the service_role key, so they live ONLY in
// the shell environment of the machine that runs the script: never in the repo, never EXPO_PUBLIC_.
const REQUIRED = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];

class MissingEnvError extends Error {
  constructor(names) {
    super(
      `Variabili d'ambiente mancanti: ${names.join(', ')} (vedi docs/places-sync.md). SUPABASE_SERVICE_ROLE_KEY deve essere la chiave service_role LEGACY in formato JWT (Dashboard → Project Settings → API Keys → Legacy API keys), non una sb_secret_…`,
    );
    this.name = 'MissingEnvError';
  }
}

function readServiceEnv(env) {
  const missing = REQUIRED.filter((name) => !(env[name] ?? '').trim());
  if (missing.length > 0) throw new MissingEnvError(missing);
  return {
    url: env.SUPABASE_URL.trim().replace(/\/+$/, ''),
    serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY.trim(),
  };
}

module.exports = { MissingEnvError, readServiceEnv };
