import { act, render, screen, waitFor } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { ZoomableImage } from './ZoomableImage';

const SIZE = { width: 400, height: 800 };

async function renderImage() {
  const onZoomChange = jest.fn();
  const onDismiss = jest.fn();
  await render(
    <GestureHandlerRootView>
      <ZoomableImage
        size={SIZE}
        uri="https://signed.test/a"
        cacheKey="a"
        label="foto"
        onZoomChange={onZoomChange}
        onDismiss={onDismiss}
      />
    </GestureHandlerRootView>,
  );
  return { onZoomChange, onDismiss };
}

describe('ZoomableImage', () => {
  it("mostra la foto con l'etichetta e senza ingrandimento", async () => {
    const { onZoomChange } = await renderImage();
    expect(await screen.findByLabelText('foto')).toBeOnTheScreen();
    expect(onZoomChange).not.toHaveBeenCalled();
  });

  it('il pizzico oltre 1× segnala che la foto è ingrandita', async () => {
    const { onZoomChange } = await renderImage();
    await screen.findByLabelText('foto');
    await act(async () => {
      fireGestureHandler(getByGestureTestId('viewer-pinch'), [
        { scale: 1, focalX: 200, focalY: 400 },
        { scale: 2, focalX: 200, focalY: 400 },
      ]);
    });
    await waitFor(() => expect(onZoomChange).toHaveBeenCalledWith(true));
  });

  it('il doppio tap su una foto non ingrandita la ingrandisce', async () => {
    const { onZoomChange } = await renderImage();
    await screen.findByLabelText('foto');
    await act(async () => {
      fireGestureHandler(getByGestureTestId('viewer-double-tap'), [{ x: 300, y: 600 }]);
    });
    await waitFor(() => expect(onZoomChange).toHaveBeenCalledWith(true));
  });

  it('un trascinamento lungo in verticale chiude il viewer', async () => {
    const { onDismiss } = await renderImage();
    await screen.findByLabelText('foto');
    await act(async () => {
      fireGestureHandler(getByGestureTestId('viewer-dismiss'), [
        { translationY: 20, velocityY: 0 },
        { translationY: 260, velocityY: 300 },
      ]);
    });
    await waitFor(() => expect(onDismiss).toHaveBeenCalledTimes(1));
  });

  it('un trascinamento corto e lento non chiude il viewer', async () => {
    const { onDismiss } = await renderImage();
    await screen.findByLabelText('foto');
    await act(async () => {
      fireGestureHandler(getByGestureTestId('viewer-dismiss'), [
        { translationY: 10, velocityY: 0 },
        { translationY: 30, velocityY: 50 },
      ]);
    });
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
