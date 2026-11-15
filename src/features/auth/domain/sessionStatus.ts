export type SessionStatus =
  'loading' | 'signedOut' | 'unverified' | 'needsProfile' | 'needsHandle' | 'ready';

type SessionFacts = {
  initialized: boolean;
  session: { emailConfirmed: boolean } | null;
  // undefined = still loading; null = no profile row
  profile:
    | { birthDate: string | null; handleConfirmedAt: string | null; deleted: boolean }
    | null
    | undefined;
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
  if (!profile.birthDate) return 'needsProfile';
  // The onboarding @tag step is part of the profile: closing the app before "Continua" brings the user back to it.
  return profile.handleConfirmedAt ? 'ready' : 'needsHandle';
}
