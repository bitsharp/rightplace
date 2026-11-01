import { fireEvent, render, screen } from '@testing-library/react-native';

import { TopBar, type Story } from './TopBar';

const STORIES: Story[] = [
  { id: 'me', handle: 'lince.rosso', initial: 'L', tone: 'neutral', mine: true },
  { id: 's1', handle: 'volpe.viola', initial: 'V', tone: 'going' },
];

const baseProps = {
  handle: 'lince.rosso',
  hasNews: false,
  stories: STORIES,
  onPost: jest.fn(),
  onOpenProfile: jest.fn(),
  onOpenNews: jest.fn(),
  onOpenStory: jest.fn(),
};

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

  it('elenca le storie e apre quella toccata', async () => {
    const onOpenStory = jest.fn();
    await render(<TopBar {...baseProps} canPost={false} onOpenStory={onOpenStory} />);
    expect(screen.getByRole('button', { name: 'ui:topBar.myStoryA11y' })).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'ui:topBar.storyA11y({"handle":"@volpe.viola"})' }),
    );
    expect(onOpenStory).toHaveBeenCalledWith('s1');
  });
});
