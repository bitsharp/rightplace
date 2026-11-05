import * as Crypto from 'expo-crypto';

// The single place that talks to expo-crypto; callers hash through hashPhone(e164, sha256).
export const sha256 = (value: string) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
