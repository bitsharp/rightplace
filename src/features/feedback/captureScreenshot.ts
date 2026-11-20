import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { captureScreen } from 'react-native-view-shot';

import { resizeTarget } from '@/lib/photos/photoSize';

const MAX_SIDE = 1080;
const JPEG_QUALITY = 0.8;

// Only called after an explicit tap on the feedback icon. Returns the uri of a temporary JPEG (long side
// <= 1080 px) or null: a failed capture must never stop the user from sending a comment.
export async function captureScreenshot(): Promise<string | null> {
  try {
    const uri = await captureScreen({ format: 'jpg', quality: 1, result: 'tmpfile' });
    const original = await ImageManipulator.manipulate(uri).renderAsync();
    const target = resizeTarget(original.width, original.height, MAX_SIDE);
    const context = ImageManipulator.manipulate(uri);
    if (target.width !== original.width || target.height !== original.height)
      context.resize(target);
    const resized = await context.renderAsync();
    const saved = await resized.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
    return saved.uri;
  } catch {
    // Capture is best effort (a view that cannot be drawn, no memory): the sheet opens without it.
    return null;
  }
}
