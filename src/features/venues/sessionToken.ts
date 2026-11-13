import { randomUUID } from 'expo-crypto';

// Google wants a UUID v4 per search session; the server also counts sessions by it.
export const newSessionToken = (): string => randomUUID();
