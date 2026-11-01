import { formatHandle } from '@/features/profile/domain/handle';
import type { TypographyVariant } from '@/theme/typography';

import { Text } from './Text';

type Props = {
  handle: string;
  variant?: TypographyVariant;
};

// The handle is the only public identity (CLAUDE.md principle 1); it is never translated.
export function HandleText({ handle, variant = 'body15Strong' }: Props) {
  return (
    <Text variant={variant} numberOfLines={1}>
      {formatHandle(handle)}
    </Text>
  );
}
