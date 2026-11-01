import { fireEvent, render, screen } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { PostCard } from './PostCard';

const baseProps = {
  handle: 'volpe.viola',
  meta: 'Arena Club',
  tone: 'going' as const,
  daysLeft: 6,
  likeCount: 12,
  liked: false,
  commentCount: 3,
  onToggleLike: jest.fn(),
};

describe('PostCard', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra autore, locale e scadenza in giorni', async () => {
    await render(<PostCard {...baseProps} />);
    expect(screen.getByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText('Arena Club')).toBeOnTheScreen();
    expect(screen.getByText('ui:post.expires({"count":6})')).toBeOnTheScreen();
  });

  it('mostra la didascalia solo se presente', async () => {
    const { rerender } = await render(<PostCard {...baseProps} />);
    expect(screen.queryByTestId('post-caption')).not.toBeOnTheScreen();
    await rerender(<PostCard {...baseProps} caption="Si inizia!" />);
    expect(screen.getByText('Si inizia!')).toBeOnTheScreen();
  });

  it('mostra like e commenti', async () => {
    await render(<PostCard {...baseProps} />);
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('mette il like con feedback aptico', async () => {
    const onToggleLike = jest.fn();
    await render(<PostCard {...baseProps} onToggleLike={onToggleLike} />);
    const like = screen.getByRole('button', { name: 'ui:post.like' });
    expect(like).not.toBeSelected();
    await fireEvent.press(like);
    expect(onToggleLike).toHaveBeenCalled();
    expect(Haptics.notificationAsync).toHaveBeenCalled();
  });

  it('segnala il like già messo', async () => {
    await render(<PostCard {...baseProps} liked />);
    expect(screen.getByRole('button', { name: 'ui:post.like' })).toBeSelected();
  });
});
