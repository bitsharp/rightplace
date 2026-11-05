import { nightLabelKey } from './nightLabel';
import type { FeedPost } from './types';

type Translate = (key: string, options?: Record<string, unknown>) => string;

// "Arena Club · ieri sera": the words come from i18n (keys under `feed:meta`), only the choice is made here.
export function postMetaText(
  t: Translate,
  post: Pick<FeedPost, 'venueName' | 'nightDate'>,
  now: Date,
): string {
  if (post.venueName === null) return t('meta.unknown');
  const venue = post.venueName;
  const label = nightLabelKey(post.nightDate, now);
  if (label.key === 'none') return t('meta.venueOnly', { venue });
  if (label.key === 'daysAgo') return t('meta.daysAgo', { venue, count: label.days });
  return t(`meta.${label.key}`, { venue });
}
