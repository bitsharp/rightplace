import type { AvatarIntent } from '@/components/ui/Avatar';

const INTENTS: readonly AvatarIntent[] = ['going', 'maybe', 'neutral'];

// Only existing design tokens: the same handle always gets the same colour, on every device.
export function avatarIntent(handle: string): AvatarIntent {
  const name = handle.replace(/^@/, '');
  let hash = 5381;
  for (const char of name) hash = (hash * 33 + char.charCodeAt(0)) >>> 0;
  return INTENTS[hash % INTENTS.length] ?? 'neutral';
}
