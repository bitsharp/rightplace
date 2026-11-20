import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import { STORY_RING_SIZE } from './StoryAvatar';
import { TopBar, type Story } from './TopBar';

const STORIES: Story[] = [
  { id: 'me', handle: 'lince.rosso', initial: 'L', tone: 'neutral', mine: true, seen: true },
  { id: 's1', handle: 'volpe.viola', initial: 'V', tone: 'going', seen: false },
  { id: 's2', handle: 'orso.verde', initial: 'O', tone: 'going', seen: true },
];

const baseProps = {
  handle: 'lince.rosso',
  hasNews: false,
  stories: STORIES,
  onPost: jest.fn(),
  onOpenProfile: jest.fn(),
  onOpenNews: jest.fn(),
  onOpenFeedback: jest.fn(),
  onOpenStory: jest.fn(),
};

describe('TopBar: foto delle storie', () => {
  it('mostra la foto di chi ce l’ha visibile e l’iniziale per gli altri', async () => {
    const stories: Story[] = [
      {
        id: 'me',
        handle: 'lince.rosso',
        initial: 'L',
        tone: 'neutral',
        mine: true,
        photo: { uri: 'https://signed.test/a/me', cacheKey: 'me' },
      },
      { id: 's1', handle: 'volpe.viola', initial: 'V', tone: 'going' },
    ];
    await render(<TopBar {...baseProps} canPost={false} stories={stories} />);
    expect(screen.getAllByTestId('avatar-image', { includeHiddenElements: true })).toHaveLength(1);
    expect(screen.getByText('V', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});

describe('TopBar', () => {
  it('nasconde il "+" finché l’utente non ha dichiarato la serata', async () => {
    await render(<TopBar {...baseProps} canPost={false} />);
    expect(screen.queryByRole('button', { name: 'ui:topBar.post' })).not.toBeOnTheScreen();
  });

  it('mostra il "+" con canPost e apre il post', async () => {
    const onPost = jest.fn();
    await render(<TopBar {...baseProps} canPost onPost={onPost} />);
    await fireEvent.press(screen.getByRole('button', { name: 'ui:topBar.post' }));
    expect(onPost).toHaveBeenCalled();
  });

  it('mostra l’handle e apre il profilo', async () => {
    const onOpenProfile = jest.fn();
    await render(<TopBar {...baseProps} canPost={false} onOpenProfile={onOpenProfile} />);
    expect(screen.getByText('@lince.rosso')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'ui:topBar.profile' }));
    expect(onOpenProfile).toHaveBeenCalled();
  });

  it('mostra il pallino delle novità solo se ce ne sono', async () => {
    const { rerender } = await render(<TopBar {...baseProps} canPost={false} />);
    expect(screen.queryByTestId('news-dot', { includeHiddenElements: true })).not.toBeOnTheScreen();
    await rerender(<TopBar {...baseProps} canPost={false} hasNews />);
    expect(screen.getByTestId('news-dot', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('mostra sempre l’icona del feedback, grande quanto il cuore, e la apre al tocco', async () => {
    const onOpenFeedback = jest.fn();
    await render(<TopBar {...baseProps} canPost={false} onOpenFeedback={onOpenFeedback} />);
    const feedback = screen.getByRole('button', { name: 'ui:topBar.feedback' });
    const news = screen.getByRole('button', { name: 'ui:topBar.news' });
    const hidden = { includeHiddenElements: true };
    expect(screen.getByTestId('icon-feedback', hidden).props.width).toBe(
      screen.getByTestId('icon-heart', hidden).props.width,
    );
    expect(StyleSheet.flatten(feedback.props.style).height).toBe(
      StyleSheet.flatten(news.props.style).height,
    );
    await fireEvent.press(feedback);
    expect(onOpenFeedback).toHaveBeenCalled();
  });

  it('l’icona del feedback sta subito prima del cuore', async () => {
    await render(<TopBar {...baseProps} canPost={false} />);
    const labels = screen.getAllByRole('button').map((node) => node.props.accessibilityLabel);
    expect(labels.indexOf('ui:topBar.feedback') + 1).toBe(labels.indexOf('ui:topBar.news'));
  });

  it('elenca le storie e apre quella toccata', async () => {
    const onOpenStory = jest.fn();
    await render(<TopBar {...baseProps} canPost={false} onOpenStory={onOpenStory} />);
    expect(screen.getByRole('button', { name: 'ui:topBar.myStoryA11y' })).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'ui:topBar.storyA11y({"handle":"@volpe.viola"})' }),
    );
    expect(onOpenStory).toHaveBeenCalledWith('s1');
  });

  it('distingue le storie non viste (anello sfumato) da quelle viste (anello grigio)', async () => {
    await render(<TopBar {...baseProps} canPost={false} />);
    expect(screen.getAllByTestId('story-ring-new')).toHaveLength(1);
    expect(screen.getAllByTestId('story-ring-seen')).toHaveLength(2);
  });

  it('il nome sotto la storia ha spazio largo almeno quanto l’anello e va su una riga', async () => {
    const stories: Story[] = [
      { id: 's1', handle: 'demo.milano2', initial: 'D', tone: 'going', seen: false },
    ];
    await render(<TopBar {...baseProps} canPost={false} stories={stories} />);
    const name = screen.getByText('demo.milano2');
    expect(name.props.numberOfLines).toBe(1);
    expect(name.props.ellipsizeMode).toBe('tail');
    const label = StyleSheet.flatten(name.props.style);
    expect(label.width).toBeGreaterThanOrEqual(STORY_RING_SIZE + 8);
    expect(label.textAlign).toBe('center');
  });
});
