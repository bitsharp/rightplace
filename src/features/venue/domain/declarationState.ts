import type { MyDeclaration } from '@/features/map/api';
import type { Intent } from '@/features/nights/domain/band';

export type DeclarationTarget = { kind: 'night' | 'event'; id: string };

export type DeclarationState =
  | { kind: 'none' }
  | { kind: 'here'; intent: Intent; expiresAt: string }
  | { kind: 'elsewhere'; venueName: string };

// One active plan per user: it is either for this target ("here") or for something else.
export function declarationFor(
  mine: MyDeclaration | null,
  target: DeclarationTarget,
): DeclarationState {
  if (!mine) return { kind: 'none' };
  const isHere = target.kind === 'night' ? mine.venueId === target.id : mine.eventId === target.id;
  if (!isHere) return { kind: 'elsewhere', venueName: mine.venueName };
  return { kind: 'here', intent: mine.intent, expiresAt: mine.expiresAt };
}
