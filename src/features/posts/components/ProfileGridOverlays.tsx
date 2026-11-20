import { useTranslation } from 'react-i18next';

import { PhotoViewer } from '@/components/app/PhotoViewer';
import { Toast } from '@/components/ui/Toast';

import type { ProfileGrid } from '../useProfileGrid';
import { PostActionsSheet } from './PostActionsSheet';
import { PostTextSheet } from './PostTextSheet';

// What opens over a profile grid: the full-screen photos, the caption of a text post, report / block / delete.
export function ProfileGridOverlays({ grid }: { grid: ProfileGrid }) {
  const { t } = useTranslation('feed');
  return (
    <>
      {grid.notice ? <Toast tone="success" message={t(`actions.${grid.notice}`)} /> : null}
      <PhotoViewer
        photos={grid.viewer.photos}
        index={grid.viewer.index}
        onClose={grid.viewer.close}
      />
      <PostTextSheet post={grid.textPost} onClose={grid.closeText} />
      <PostActionsSheet
        post={grid.actionsFor}
        onClose={() => grid.openActions(null)}
        onDone={grid.setNotice}
      />
    </>
  );
}
