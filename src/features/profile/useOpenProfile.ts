import { useRouter } from 'expo-router';

export type ProfileTarget = { handle: string; isMine: boolean };

// One rule for "tap an author anywhere": my own profile is the Profile tab, anyone else's the public
// profile (what I may see there is decided by the server, not by this navigation).
export function useOpenProfile() {
  const router = useRouter();
  return ({ handle, isMine }: ProfileTarget) =>
    router.push(isMine ? '/profile' : `/u/${handle.replace(/^@/, '')}`);
}
