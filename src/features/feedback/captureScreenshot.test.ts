import { ImageManipulator } from 'expo-image-manipulator';
import { captureScreen } from 'react-native-view-shot';

import { captureScreenshot } from './captureScreenshot';

jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

const capture = jest.mocked(captureScreen);
const manipulate = jest.mocked(ImageManipulator.manipulate);

function stubManipulator(rendered: { width: number; height: number }) {
  const saveAsync = jest.fn(async () => ({ uri: 'file:///small.jpg', ...rendered }));
  const resize = jest.fn();
  const renderAsync = jest.fn(async () => ({ ...rendered, saveAsync }));
  const context = { resize, renderAsync };
  resize.mockReturnValue(context);
  manipulate.mockReturnValue(context as unknown as ReturnType<typeof manipulate>);
  return { resize, saveAsync };
}

describe('captureScreenshot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capture.mockResolvedValue('file:///shot.jpg');
  });

  it('cattura la schermata in JPEG su file temporaneo', async () => {
    stubManipulator({ width: 1080, height: 1920 });
    await captureScreenshot();
    expect(capture).toHaveBeenCalledWith(
      expect.objectContaining({ format: 'jpg', result: 'tmpfile' }),
    );
  });

  it('ridimensiona a un lato lungo massimo di 1080 px e restituisce il nuovo file', async () => {
    const { resize } = stubManipulator({ width: 1440, height: 2880 });
    await expect(captureScreenshot()).resolves.toBe('file:///small.jpg');
    expect(resize).toHaveBeenCalledWith({ width: 540, height: 1080 });
  });

  it('non ingrandisce uno screenshot già piccolo', async () => {
    const { resize } = stubManipulator({ width: 720, height: 1000 });
    await captureScreenshot();
    expect(resize).not.toHaveBeenCalled();
  });

  it('se la cattura fallisce restituisce null: il feedback si può inviare senza screenshot', async () => {
    capture.mockRejectedValue(new Error('no view'));
    await expect(captureScreenshot()).resolves.toBeNull();
  });
});
