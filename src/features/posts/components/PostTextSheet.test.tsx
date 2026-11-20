import { fireEvent, render, screen } from '@testing-library/react-native';

import type { FeedPost } from '../domain/types';
import { PostTextSheet } from './PostTextSheet';

const post: FeedPost = {
  id: 't',
  authorId: 'u1',
  authorHandle: 'volpe.viola',
  venueName: 'Arena Club',
  nightDate: null,
  caption: 'Che serata! www.example.com',
  hasPhoto: false,
  visibleFrom: '2026-11-09T05:00:00+00:00',
  expiresAt: '2026-11-16T05:00:00+00:00',
  likeCount: 0,
  commentCount: 0,
  likedByMe: false,
  isMine: false,
};

describe('PostTextSheet', () => {
  it('mostra la didascalia intera e il locale', async () => {
    await render(<PostTextSheet post={post} onClose={jest.fn()} />);
    expect(screen.getByText('feed:meta.venueOnly({"venue":"Arena Club"})')).toBeOnTheScreen();
    expect(screen.getByTestId('post-caption')).toBeOnTheScreen();
  });

  it('Chiudi chiude il foglio', async () => {
    const onClose = jest.fn();
    await render(<PostTextSheet post={post} onClose={onClose} />);
    await fireEvent.press(screen.getByText('feed:comments.close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('senza post non mostra nulla', async () => {
    await render(<PostTextSheet post={null} onClose={jest.fn()} />);
    expect(screen.queryByText('feed:comments.close')).toBeNull();
  });
});
