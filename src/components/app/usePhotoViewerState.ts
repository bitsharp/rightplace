import { useState } from 'react';

import type { ViewerPhoto } from './PhotoViewer';

// Which photo the viewer is open on, by id: a list that grows or reorders while it is open does not move it.
// The photos keep the signed URLs their screen already loaded: the viewer downloads and stores nothing more.
export function usePhotoViewerState(photos: ViewerPhoto[]) {
  const [openId, setOpenId] = useState<string | null>(null);
  const found = photos.findIndex((photo) => photo.id === openId);
  return {
    photos,
    index: found >= 0 ? found : null,
    open: setOpenId,
    close: () => setOpenId(null),
  };
}
