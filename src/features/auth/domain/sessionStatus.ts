export type SessionStatus = 'loading' | 'signedOut' | 'unverified' | 'needsProfile' | 'ready';

type SessionFacts = {
  initialized: boolean;
  session: { emailConfirmed: boolean } | null;
  // undefined = still loading; null = no profile row
  profile: { birthDate: string | null; deleted: boolean } | null | undefined;
};

export function deriveSessionStatus({
  initialized,
  session,
  profile,
}: SessionFacts): SessionStatus {
  if (!initialized) return 'loading';
  if (!session) return 'signedOut';
  if (!session.emailConfirmed) return 'unverified';
  if (profile === undefined) return 'loading';
  if (profile === null || profile.deleted) return 'signedOut';
  return profile.birthDate ? 'ready' : 'needsProfile';
}
