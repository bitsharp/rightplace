import type { ActivityKind } from '../api';

// Where a row of "Novità" leads. Follow requests live inside the Friends tab.
export function activityRoute(item: { kind: ActivityKind; actorHandle: string }): string {
  switch (item.kind) {
    case 'like':
    case 'comment':
      return '/feed';
    case 'follow_request':
      return '/friends';
    case 'follow_accepted':
      return `/u/${item.actorHandle}`;
  }
}
