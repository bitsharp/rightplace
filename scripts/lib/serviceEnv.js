// Variables for the maintainer's CLI scripts. They live ONLY in the shell environment of the machine
// that runs the script: never in the repo, never EXPO_PUBLIC_. Each script asks only for its own.

const { DEFAULT_ACTOR_ID, normalizeActorId } = require('./apifyInput');

const HINTS = {
  SUPABASE_SERVICE_ROLE_KEY:
    'deve essere la chiave service_role LEGACY in formato JWT (Dashboard → Project Settings → API Keys → Legacy API keys), non una sb_secret_…',
  SUPABASE_ANON_KEY:
    'deve essere la chiave anon LEGACY in formato JWT (Dashboard → Project Settings → API Keys → Legacy API keys), non una sb_publishable_…: serve solo a passare il gateway delle Functions',
  APIFY_TOKEN:
    'è il token API Apify (console.apify.com → Settings → API & Integrations): tienilo solo nella shell, mai nel repo',
  SYNC_ADMIN_KEY:
    'è il secret della funzione places-sync: generala e impostala con `npx supabase secrets set SYNC_ADMIN_KEY=<valore>`',
};

class MissingEnvError extends Error {
  constructor(names) {
    const hints = names.filter((name) => HINTS[name]).map((name) => `${name} ${HINTS[name]}.`);
    super(
      [
        `Variabili d'ambiente mancanti: ${names.join(', ')} (vedi docs/places-sync.md).`,
        ...hints,
      ].join(' '),
    );
    this.name = 'MissingEnvError';
  }
}

function readVariables(env, names) {
  const missing = names.filter((name) => !(env[name] ?? '').trim());
  if (missing.length > 0) throw new MissingEnvError(missing);
  return Object.fromEntries(names.map((name) => [name, env[name].trim()]));
}

const withoutTrailingSlash = (url) => url.replace(/\/+$/, '');

// typical:import — calls a REST RPC that only service_role can execute.
function readServiceEnv(env) {
  const values = readVariables(env, ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']);
  return {
    url: withoutTrailingSlash(values.SUPABASE_URL),
    serviceRoleKey: values.SUPABASE_SERVICE_ROLE_KEY,
  };
}

// venues:sync — never needs the service_role key.
function readSyncEnv(env) {
  const values = readVariables(env, ['SUPABASE_URL', 'SYNC_ADMIN_KEY', 'SUPABASE_ANON_KEY']);
  return {
    url: withoutTrailingSlash(values.SUPABASE_URL),
    syncAdminKey: values.SYNC_ADMIN_KEY,
    anonKey: values.SUPABASE_ANON_KEY,
  };
}

// typical:apify — the token never leaves this process except in the Authorization header to Apify.
function readApifyEnv(env) {
  const { APIFY_TOKEN: token } = readVariables(env, ['APIFY_TOKEN']);
  const actorId = (env.APIFY_ACTOR_ID ?? '').trim() || DEFAULT_ACTOR_ID;
  return { token, actorId: normalizeActorId(actorId) };
}

module.exports = { MissingEnvError, readApifyEnv, readServiceEnv, readSyncEnv };
