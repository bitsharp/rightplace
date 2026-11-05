import { useTranslation } from 'react-i18next';
import { Share } from 'react-native';

import { Button } from '@/components/ui/Button';
import { shareLinks } from '@/features/friends/domain/shareLinks';

import { formatHandle } from '../domain/handle';

// The way to be followed by people met offline: it shares the @tag and nothing else.
export function ShareHandleButton({ handle }: { handle: string }) {
  const { t } = useTranslation('profile');
  const share = () => {
    const links = shareLinks(handle);
    return Share.share({
      message: t('share.message', { handle: formatHandle(handle), web: links.web, app: links.app }),
    });
  };
  return (
    <Button label={t('share.cta')} variant="secondary" size="md" onPress={() => void share()} />
  );
}
