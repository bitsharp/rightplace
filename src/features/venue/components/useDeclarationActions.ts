import { useState } from 'react';

import { requestPrePermission } from '@/features/notifications/prePermission';
import type { Intent } from '@/features/nights/domain/band';
import { RpcError, type RpcErrorCode } from '@/lib/rpcError';

import type { DeclarationState, DeclarationTarget } from '../domain/declarationState';
import { useDeclare, useUndeclare } from '../hooks';

export type PendingConfirm = 'cancel' | 'remove' | null;

type Params = {
  target: DeclarationTarget;
  venue: { id: string; name: string };
  state: DeclarationState;
  onClose: () => void;
  // A new declaration keeps the sheet open: it turns into "La tua serata" with the friends going.
  stayOpenAfterDeclare?: boolean;
};

const errorCodeOf = (error: unknown): RpcErrorCode | null => {
  if (error === null) return null;
  return error instanceof RpcError ? error.code : 'UNKNOWN';
};

// The sheet closes only after the server accepted the change; until then the optimistic cache
// update already shows the new state, and a refusal rolls it back and keeps the sheet open.
export function useDeclarationActions({
  target,
  venue,
  state,
  onClose,
  stayOpenAfterDeclare = false,
}: Params) {
  const declare = useDeclare();
  const undeclare = useUndeclare();
  const [confirming, setConfirming] = useState<PendingConfirm>(null);

  const choose = (intent: Intent) =>
    declare.mutate(
      { target, intent, venue },
      {
        onSuccess: () => {
          if (!stayOpenAfterDeclare) onClose();
          // notifications: first declaration asks for permission once the sheet is gone
          requestPrePermission();
        },
      },
    );
  const edit = () => {
    if (state.kind === 'here') choose(state.intent === 'going' ? 'maybe' : 'going');
  };
  const confirm = () => {
    const closeAfter = confirming === 'remove';
    setConfirming(null);
    undeclare.mutate(undefined, { onSuccess: closeAfter ? onClose : undefined });
  };

  return {
    choose,
    edit,
    confirm,
    confirming,
    ask: setConfirming,
    dismissConfirm: () => setConfirming(null),
    errorCode: errorCodeOf(declare.error ?? undeclare.error),
    busy: declare.isPending || undeclare.isPending,
  };
}
