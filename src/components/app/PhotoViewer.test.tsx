import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Dimensions, Platform } from 'react-native';
import { fireGestureHandler, getByGestureTestId } from 'react-native-gesture-handler/jest-utils';

import { PhotoViewer, type ViewerPhoto } from './PhotoViewer';

const PHOTOS: ViewerPhoto[] = [
  { id: 'a', uri: 'https://signed.test/a' },
  { id: 'b', uri: 'https://signed.test/b' },
  { id: 'c', uri: 'https://signed.test/c' },
];

describe('PhotoViewer', () => {
  it('da chiuso non mostra nulla', async () => {
    await render(<PhotoViewer photos={PHOTOS} index={null} onClose={jest.fn()} />);
    expect(screen.queryByText(/photoViewer.counter/)).toBeNull();
  });

  it('senza foto non si apre', async () => {
    await render(<PhotoViewer photos={[]} index={0} onClose={jest.fn()} />);
    expect(screen.queryByText(/photoViewer.counter/)).toBeNull();
  });

  it('si apre sulla foto richiesta con il contatore "2 / 3"', async () => {
    await render(<PhotoViewer photos={PHOTOS} index={1} onClose={jest.fn()} />);
    expect(screen.getByText('ui:photoViewer.counter({"current":2,"total":3})')).toBeOnTheScreen();
    expect(screen.getByTestId('photo-viewer-list').props.initialScrollIndex).toBe(1);
  });

  it("se l'indice è fuori dai limiti si apre sull'ultima foto", async () => {
    await render(<PhotoViewer photos={PHOTOS} index={9} onClose={jest.fn()} />);
    expect(screen.getByText('ui:photoViewer.counter({"current":3,"total":3})')).toBeOnTheScreen();
  });

  it('ogni foto ha l\'etichetta di accessibilità "Foto X di N"', async () => {
    await render(<PhotoViewer photos={PHOTOS} index={0} onClose={jest.fn()} />);
    expect(screen.getAllByLabelText(/ui:photoViewer.photoOf/).length).toBeGreaterThan(0);
    expect(
      screen.getByLabelText('ui:photoViewer.photoOf({"current":1,"total":3})'),
    ).toBeOnTheScreen();
  });

  it('scorrendo alla pagina successiva il contatore si aggiorna', async () => {
    await render(<PhotoViewer photos={PHOTOS} index={0} onClose={jest.fn()} />);
    await fireEvent(screen.getByTestId('photo-viewer-list'), 'momentumScrollEnd', {
      nativeEvent: { contentOffset: { x: 2 * Dimensions.get('window').width, y: 0 } },
    });
    expect(screen.getByText('ui:photoViewer.counter({"current":3,"total":3})')).toBeOnTheScreen();
  });

  it('la X di chiusura è un bottone da almeno 44 con etichetta', async () => {
    const onClose = jest.fn();
    await render(<PhotoViewer photos={PHOTOS} index={0} onClose={onClose} />);
    const close = screen.getByRole('button', { name: 'ui:photoViewer.close' });
    expect(close).toHaveStyle({ width: 44, height: 44 });
    await fireEvent.press(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('il tasto indietro di Android chiude il viewer', async () => {
    const onClose = jest.fn();
    await render(<PhotoViewer photos={PHOTOS} index={0} onClose={onClose} />);
    await act(async () => screen.getByTestId('photo-viewer-modal').props.onRequestClose());
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('la finestra copre la status bar e non offre né salvataggio né condivisione', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    await render(<PhotoViewer photos={PHOTOS} index={0} onClose={jest.fn()} />);
    expect(screen.getByTestId('photo-viewer-modal').props.statusBarTranslucent).toBe(true);
    expect(screen.queryByRole('button', { name: /save|salva|share|condividi/i })).toBeNull();
  });

  it('mentre una foto è ingrandita lo scorrimento tra foto è disattivato, poi si riattiva', async () => {
    await render(<PhotoViewer photos={PHOTOS} index={0} onClose={jest.fn()} />);
    const list = screen.getByTestId('photo-viewer-list');
    expect(list.props.scrollEnabled).toBe(true);
    await act(async () => {
      fireGestureHandler(getByGestureTestId('viewer-double-tap'), [{ x: 100, y: 100 }]);
    });
    await waitFor(() =>
      expect(screen.getByTestId('photo-viewer-list').props.scrollEnabled).toBe(false),
    );
    await act(async () => {
      fireGestureHandler(getByGestureTestId('viewer-double-tap'), [{ x: 100, y: 100 }]);
    });
    await waitFor(() =>
      expect(screen.getByTestId('photo-viewer-list').props.scrollEnabled).toBe(true),
    );
  });

  it('uno swipe verso il basso chiude il viewer', async () => {
    const onClose = jest.fn();
    await render(<PhotoViewer photos={PHOTOS} index={0} onClose={onClose} />);
    await act(async () => {
      fireGestureHandler(getByGestureTestId('viewer-dismiss'), [
        { translationY: 20, velocityY: 0 },
        { translationY: 300, velocityY: 400 },
      ]);
    });
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
  });
});
