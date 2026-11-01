// Deliberately simple: Supabase validates for real; this only enables the CTA.
export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
}
