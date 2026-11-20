import { fireEvent, render, screen } from '@testing-library/react-native';
import { Dimensions, Text } from 'react-native';

import type { FeedPost } from '../domain/types';
import { PostGrid } from './PostGrid';

const post = (id: string, overrides: Partial<FeedPost> = {}): FeedPost => ({
  id,
  authorId: 'u1',
  authorHandle: 'volpe.viola',
  venueName: 'Arena Club',
  nightDate: '2026-11-08',
  caption: null,
  hasPhoto: true,
  visibleFrom: '2026-11-09T05:00:00+00:00',
  expiresAt: '2026-11-16T05:00:00+00:00',
  likeCount: 0,
  commentCount: 0,
  likedByMe: false,
  isMine: false,
  ...overrides,
});

const props = {
  header: <Text>intestazione</Text>,
  empty: <Text>vuoto</Text>,
  photoUrls: { a: 'https://signed.test/a' } as Record<string, string>,
  onOpenPost: jest.fn(),
  onLongPressPost: jest.fn(),
  onLoadMore: jest.fn(),
};

describe('PostGrid', () => {
  beforeEach(() => jest.clearAllMocks());

  it('mostra l’intestazione e tessere quadrate larghe un terzo dello spazio utile', async () => {
    await render(<PostGrid {...props} posts={[post('a')]} />);
    expect(screen.getByText('intestazione')).toBeOnTheScreen();
    // 20 px of padding per side and 2 px between tiles
    const side = Math.floor((Dimensions.get('window').width - 40 - 4) / 3);
    expect(screen.getByRole('button')).toHaveStyle({ width: side, height: side });
  });

  it('un post con foto mostra la miniatura con la chiave di cache in memoria', async () => {
    await render(<PostGrid {...props} posts={[post('a', { caption: 'Si inizia' })]} />);
    expect(screen.getByLabelText('Si inizia').props).toMatchObject({
      cachePolicy: 'memory',
      source: [{ uri: 'https://signed.test/a', cacheKey: 'a' }],
    });
  });

  it('un post solo testo è una tessera con la didascalia', async () => {
    await render(
      <PostGrid {...props} posts={[post('t', { hasPhoto: false, caption: 'Che serata!' })]} />,
    );
    expect(screen.getByText('Che serata!')).toBeOnTheScreen();
    expect(screen.queryByTestId('photo-placeholder', { includeHiddenElements: true })).toBeNull();
  });

  it('tocco e tocco lungo passano il post', async () => {
    const first = post('a');
    await render(<PostGrid {...props} posts={[first]} />);
    const tile = screen.getByRole('button', { name: 'feed:grid.open({"handle":"@volpe.viola"})' });
    await fireEvent.press(tile);
    await fireEvent(tile, 'longPress');
    expect(props.onOpenPost).toHaveBeenCalledWith(first);
    expect(props.onLongPressPost).toHaveBeenCalledWith(first);
  });

  it('senza post mostra il contenuto “vuoto” sotto l’intestazione', async () => {
    await render(<PostGrid {...props} posts={[]} />);
    expect(screen.getByText('intestazione')).toBeOnTheScreen();
    expect(screen.getByText('vuoto')).toBeOnTheScreen();
  });

  it('arrivati in fondo chiede la pagina successiva', async () => {
    await render(<PostGrid {...props} posts={[post('a')]} />);
    await fireEvent(screen.getByTestId('post-grid'), 'endReached');
    expect(props.onLoadMore).toHaveBeenCalled();
  });
});
