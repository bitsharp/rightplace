import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { useAvatarEditor } from '../avatar/useAvatarEditor';
import { AvatarEditor, AvatarEditorNotice } from './AvatarEditor';

const mockPick = jest.fn();
jest.mock('@/lib/photos/photos', () => ({
  pickPhoto: (source: string, shape: string) => mockPick(source, shape),
  preparePhoto: jest.fn(async () => 'file:///clean.jpg'),
  uploadPhoto: jest.fn(async () => 'me/11111111-2222-4333-8444-555555555555.jpg'),
}));
jest.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ userId: 'me', profile: { handle: 'lince.rosso' } }),
}));

const invoke = fakeSupabase.functions.invoke;
const urls = (list: { userId: string; url: string }[]) => ({ data: { urls: list }, error: null });

beforeEach(() => {
  jest.replaceProperty(Platform, 'OS', 'android');
  mockPick.mockResolvedValue({ status: 'cancelled' });
  invoke.mockResolvedValue(urls([]));
});

function Harness() {
  const editor = useAvatarEditor();
  return (
    <>
      <AvatarEditor handle="lince.rosso" editor={editor} />
      <AvatarEditorNotice editor={editor} />
    </>
  );
}

const renderEditor = () => render(<Harness />, { wrapper: createQueryWrapper().Wrapper });

describe('AvatarEditor', () => {
  it('senza foto mostra l’iniziale e la matita apre il foglio', async () => {
    await renderEditor();
    expect(screen.getByText('L', { includeHiddenElements: true })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'profile:avatar.change' }));
    expect(screen.getByText('ui:photoSource.library')).toBeOnTheScreen();
    expect(screen.queryByText('profile:avatar.remove')).toBeNull();
  });

  it('con solo l’iniziale il tap sull’avatar non apre nulla', async () => {
    await renderEditor();
    expect(screen.queryByRole('button', { name: 'profile:avatar.enlarge' })).toBeNull();
    expect(screen.queryByTestId('photo-viewer-list')).toBeNull();
    expect(screen.queryByText('ui:photoSource.library')).toBeNull();
  });

  it('con una foto il tap la ingrandisce a schermo intero senza aprire il foglio', async () => {
    invoke.mockResolvedValue(urls([{ userId: 'me', url: 'https://signed.test/me' }]));
    await renderEditor();
    await screen.findByTestId('avatar-image', { includeHiddenElements: true });
    expect(screen.queryByTestId('photo-viewer-list')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'profile:avatar.enlarge' }));
    expect(screen.getByTestId('photo-viewer-list').props.data).toEqual([
      expect.objectContaining({ uri: 'https://signed.test/me' }),
    ]);
    expect(screen.queryByText('ui:photoSource.library')).toBeNull();
  });

  it('il tocco lungo sull’avatar apre il foglio di modifica', async () => {
    invoke.mockResolvedValue(urls([{ userId: 'me', url: 'https://signed.test/me' }]));
    await renderEditor();
    await screen.findByTestId('avatar-image', { includeHiddenElements: true });
    await fireEvent(screen.getByRole('button', { name: 'profile:avatar.enlarge' }), 'longPress');
    expect(screen.getByText('ui:photoSource.library')).toBeOnTheScreen();
    expect(screen.queryByTestId('photo-viewer-list')).toBeNull();
  });

  it('con una foto la mostra e offre Rimuovi foto', async () => {
    invoke.mockResolvedValue(urls([{ userId: 'me', url: 'https://signed.test/me' }]));
    await renderEditor();
    expect(
      await screen.findByTestId('avatar-image', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'profile:avatar.change' }));
    setFakeRpc({ clear_avatar: null });
    await fireEvent.press(screen.getByText('profile:avatar.remove'));
    await waitFor(() => expect(fakeSupabase.rpc).toHaveBeenCalledWith('clear_avatar', undefined));
  });

  it('sceglie dalla galleria (ritaglio quadrato), carica il JPEG e registra il path', async () => {
    setFakeRpc({ set_avatar: null });
    mockPick.mockResolvedValue({
      status: 'picked',
      photo: { uri: 'file:///big.heic', width: 2000, height: 2000 },
    });
    await renderEditor();
    await fireEvent.press(screen.getByRole('button', { name: 'profile:avatar.change' }));
    await act(async () => fireEvent.press(screen.getByText('ui:photoSource.library')));
    expect(mockPick).toHaveBeenCalledWith('library', 'square');
    await waitFor(() =>
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('set_avatar', {
        p_path: 'me/11111111-2222-4333-8444-555555555555.jpg',
      }),
    );
  });

  it('con il permesso della fotocamera negato lo dice, senza caricare nulla', async () => {
    mockPick.mockResolvedValue({ status: 'denied' });
    await renderEditor();
    await fireEvent.press(screen.getByRole('button', { name: 'profile:avatar.change' }));
    await act(async () => fireEvent.press(screen.getByText('ui:photoSource.camera')));
    expect(await screen.findByText('ui:photoSource.denied')).toBeOnTheScreen();
    expect(fakeSupabase.rpc).not.toHaveBeenCalledWith('set_avatar', expect.anything());
  });

  it('se il salvataggio fallisce mostra l’errore tradotto', async () => {
    fakeSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'INVALID_AVATAR_PATH' } });
    mockPick.mockResolvedValue({
      status: 'picked',
      photo: { uri: 'file:///big.heic', width: 10, height: 10 },
    });
    await renderEditor();
    await fireEvent.press(screen.getByRole('button', { name: 'profile:avatar.change' }));
    await act(async () => fireEvent.press(screen.getByText('ui:photoSource.library')));
    expect(await screen.findByText('errors:rpc.INVALID_AVATAR_PATH')).toBeOnTheScreen();
  });
});
