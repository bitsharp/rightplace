import { fireEvent, render, screen } from '@testing-library/react-native';

import { MentionSuggestions } from './MentionSuggestions';

describe('MentionSuggestions', () => {
  it('ricorda che si può taggare solo chi si segue e propone gli handle', async () => {
    await render(<MentionSuggestions handles={['lince.rosso', 'lupo.nero']} onPick={jest.fn()} />);
    expect(screen.getByText('chat:composer.mentionHint')).toBeOnTheScreen();
    expect(screen.getByText('@lince.rosso')).toBeOnTheScreen();
    expect(screen.getByText('@lupo.nero')).toBeOnTheScreen();
  });

  it("un tocco sceglie l'handle (senza @)", async () => {
    const onPick = jest.fn();
    await render(<MentionSuggestions handles={['lince.rosso']} onPick={onPick} />);
    await fireEvent.press(screen.getByText('@lince.rosso'));
    expect(onPick).toHaveBeenCalledWith('lince.rosso');
  });

  it('senza suggerimenti non mostra nulla', async () => {
    await render(<MentionSuggestions handles={[]} onPick={jest.fn()} />);
    expect(screen.queryByText('chat:composer.mentionHint')).toBeNull();
  });
});
