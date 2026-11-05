import { uploadPhoto } from '@/lib/photos/photos';

import { createPost } from './api';
import { publishPost } from './publish';

jest.mock('@/lib/photos/photos', () => ({ uploadPhoto: jest.fn() }));
jest.mock('./api', () => ({ createPost: jest.fn() }));

const upload = jest.mocked(uploadPhoto);

describe('publishPost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    upload.mockImplementation(async (bucket) => `me/${bucket}.jpg`);
    jest.mocked(createPost).mockResolvedValue({ postId: 'p1', visibleFrom: 'a', expiresAt: 'b' });
  });

  it('con foto e chat viva carica nei due bucket e li passa a create_post', async () => {
    await publishPost({ userId: 'me', caption: 'ciao', cleanUri: 'file:///c.jpg', roomId: 'r1' });
    expect(upload.mock.calls).toEqual([
      ['posts', 'me', 'file:///c.jpg'],
      ['chat-photos', 'me', 'file:///c.jpg'],
    ]);
    expect(createPost).toHaveBeenCalledWith({
      caption: 'ciao',
      photoPath: 'me/posts.jpg',
      chatPhotoPath: 'me/chat-photos.jpg',
    });
  });

  it('senza chat viva carica solo il file del post', async () => {
    await publishPost({ userId: 'me', caption: '', cleanUri: 'file:///c.jpg', roomId: null });
    expect(upload.mock.calls).toEqual([['posts', 'me', 'file:///c.jpg']]);
    expect(createPost).toHaveBeenCalledWith({
      caption: '',
      photoPath: 'me/posts.jpg',
      chatPhotoPath: undefined,
    });
  });

  it('solo testo: non carica nulla', async () => {
    await publishPost({ userId: 'me', caption: 'solo parole', cleanUri: null, roomId: 'r1' });
    expect(upload).not.toHaveBeenCalled();
    expect(createPost).toHaveBeenCalledWith({
      caption: 'solo parole',
      photoPath: undefined,
      chatPhotoPath: undefined,
    });
  });

  it('se un upload fallisce non crea il post', async () => {
    upload.mockRejectedValueOnce(new Error('upload'));
    await expect(
      publishPost({ userId: 'me', caption: 'x', cleanUri: 'file:///c.jpg', roomId: null }),
    ).rejects.toThrow('upload');
    expect(createPost).not.toHaveBeenCalled();
  });
});
