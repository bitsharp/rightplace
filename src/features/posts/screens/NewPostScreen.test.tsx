import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { seedFeedBackend } from '@/test/feedBackend';
import { createQueryWrapper } from '@/test/queryWrapper';

import { NewPostScreen } from './NewPostScreen';

// The Modal is the native boundary: the stand-in exposes the props the screen gives the sheet.
let sheetProps: { onPick: (s: 'camera' | 'library') => void; onDismiss: () => void } | null = null;
jest.mock('@/components/app/PhotoSourceSheet', () => ({
  PhotoSourceSheet: (props: typeof sheetProps) => {
    sheetProps = props;
    return null;
  },
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ canGoBack: () => true, back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ userId: 'me', profile: { handle: 'lince.rosso' } }),
}));
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(async () => ({ canceled: true, assets: null })),
}));

describe('NewPostScreen', () => {
  it('su iOS il foglio rilascia il selettore solo con onDismiss', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    seedFeedBackend({ target: {} });
    await render(<NewPostScreen />, { wrapper: createQueryWrapper().Wrapper });
    await fireEvent.press(await screen.findByRole('button', { name: 'post:photo.add' }));
    await act(async () => sheetProps?.onPick('library'));
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
    await act(async () => sheetProps?.onDismiss());
    await waitFor(() => expect(ImagePicker.launchImageLibraryAsync).toHaveBeenCalledTimes(1));
  });

  it('Pubblica è disabilitato senza foto né testo, e si abilita scrivendo', async () => {
    seedFeedBackend({ target: {} });
    await render(<NewPostScreen />, { wrapper: createQueryWrapper().Wrapper });
    expect(await screen.findByRole('button', { name: 'post:publish' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('post:caption.label'), '   ');
    expect(screen.getByRole('button', { name: 'post:publish' })).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('post:caption.label'), 'ciao');
    expect(screen.getByRole('button', { name: 'post:publish' })).toBeEnabled();
  });

  it('mostra il nome del locale della serata', async () => {
    seedFeedBackend({ target: { venue_name: 'Arena Club' } });
    await render(<NewPostScreen />, { wrapper: createQueryWrapper().Wrapper });
    expect(await screen.findByText('post:venue({"venue":"Arena Club"})')).toBeOnTheScreen();
  });
});
