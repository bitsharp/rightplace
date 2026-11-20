import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { heights, spacing } from '@/theme/tokens';

import { StoryViewerScreen } from './StoryViewerScreen';

const INSET_TOP = 47;

// A fullScreenModal draws under the status bar: the inset must be applied by the screen itself.
jest.mock('react-native-safe-area-context', () => ({
  ...jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
  useSafeAreaInsets: () => ({ top: 47, bottom: 34, left: 0, right: 0 }),
}));
const mockAvatars: Record<string, string> = {};
const mockOpenAuthor = jest.fn();
jest.mock('../useStoryViewer', () => ({
  useStoryViewer: () => ({
    avatarUrls: mockAvatars,
    openAuthor: mockOpenAuthor,
    posts: [
      {
        id: 'p1',
        authorId: 'u1',
        authorHandle: 'demo.milano2',
        isMine: false,
        caption: null,
        hasPhoto: false,
        visibleFrom: '2026-11-05T10:00:00Z',
      },
    ],
    photoUrls: {},
    isLoading: false,
    close: jest.fn(),
  }),
}));

describe('StoryViewerScreen', () => {
  beforeEach(() => mockOpenAuthor.mockClear());

  it('il tocco su avatar e titolo dell’intestazione apre il profilo dell’autore', async () => {
    await render(<StoryViewerScreen userId="u1" />);
    const links = screen.getAllByRole('link', {
      name: 'ui:profileLink.open({"handle":"@demo.milano2"})',
    });
    expect(links).toHaveLength(2);
    await fireEvent.press(links[0] as never);
    await fireEvent.press(links[1] as never);
    expect(mockOpenAuthor).toHaveBeenCalledTimes(2);
  });

  it('l’intestazione parte sotto la status bar', async () => {
    await render(<StoryViewerScreen userId="u1" />);
    const header = screen.getByTestId('story-header');
    expect(StyleSheet.flatten(header.props.style).paddingTop).toBe(INSET_TOP + spacing.sm);
  });

  it('l’intestazione mostra la foto dell’autore se visibile, altrimenti l’iniziale', async () => {
    const { unmount } = await render(<StoryViewerScreen userId="u1" />);
    expect(screen.queryByTestId('avatar-image', { includeHiddenElements: true })).toBeNull();
    expect(screen.getByText('D', { includeHiddenElements: true })).toBeOnTheScreen();
    await unmount();
    mockAvatars.u1 = 'https://signed.test/a/u1';
    await render(<StoryViewerScreen userId="u1" />);
    expect(screen.getByTestId('avatar-image', { includeHiddenElements: true })).toBeOnTheScreen();
    delete mockAvatars.u1;
  });

  it('il titolo sta su una riga con ellissi', async () => {
    await render(<StoryViewerScreen userId="u1" />);
    const title = screen.getByRole('header');
    expect(title.props.numberOfLines).toBe(1);
    expect(title.props.ellipsizeMode).toBe('tail');
  });

  it('la X di chiusura è un bersaglio di almeno 44 pt', async () => {
    await render(<StoryViewerScreen userId="u1" />);
    const close = StyleSheet.flatten(
      screen.getByRole('button', { name: 'feed:story.close' }).props.style,
    );
    expect(close.width).toBeGreaterThanOrEqual(heights.minTapTarget);
    expect(close.height).toBeGreaterThanOrEqual(heights.minTapTarget);
  });
});
