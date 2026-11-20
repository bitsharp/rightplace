import { fireEvent, render, screen } from '@testing-library/react-native';

import { FeedPostItem } from './FeedPostItem';
import type { FeedPost } from '../domain/types';

const POST: FeedPost = {
  id: 'p1',
  authorId: 'u-volpe',
  authorHandle: 'volpe.viola',
  venueName: 'Arena Club',
  nightDate: '2026-11-08',
  caption: null,
  hasPhoto: false,
  visibleFrom: '2026-11-09T10:00:00Z',
  expiresAt: '2099-01-01T00:00:00Z',
  likeCount: 0,
  commentCount: 0,
  likedByMe: false,
  isMine: false,
};

const handlers = {
  onToggleLike: jest.fn(),
  onOpenComments: jest.fn(),
  onLongPress: jest.fn(),
  onOpenPhoto: jest.fn(),
  onOpenAuthor: jest.fn(),
};

describe('FeedPostItem: foto profilo', () => {
  it('mostra la foto dell’autore quando il server l’ha firmata per me', async () => {
    await render(
      <FeedPostItem
        post={POST}
        avatarUrls={{ 'u-volpe': 'https://signed.test/a/u-volpe' }}
        {...handlers}
      />,
    );
    expect(screen.getByTestId('avatar-image', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('senza URL per l’autore resta l’iniziale', async () => {
    await render(
      <FeedPostItem
        post={POST}
        avatarUrls={{ altro: 'https://signed.test/a/altro' }}
        {...handlers}
      />,
    );
    expect(screen.queryByTestId('avatar-image', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('V', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('il mio post usa la mia foto', async () => {
    await render(
      <FeedPostItem
        post={{ ...POST, authorId: 'me', isMine: true }}
        avatarUrls={{ me: 'https://signed.test/a/me' }}
        {...handlers}
      />,
    );
    expect(screen.getByTestId('avatar-image', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe('FeedPostItem: profilo dell’autore', () => {
  it('il tocco sull’@handle passa il post a onOpenAuthor', async () => {
    const onOpenAuthor = jest.fn();
    await render(<FeedPostItem post={POST} {...handlers} onOpenAuthor={onOpenAuthor} />);
    const [link] = screen.getAllByRole('link', {
      name: 'ui:profileLink.open({"handle":"@volpe.viola"})',
    });
    await fireEvent.press(link as never);
    expect(onOpenAuthor).toHaveBeenCalledWith(POST);
  });
});
