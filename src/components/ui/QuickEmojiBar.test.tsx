import { fireEvent, render, screen } from '@testing-library/react-native';

import { QUICK_EMOJIS } from '@/features/posts/domain/quickEmojis';

import { QuickEmojiBar } from './QuickEmojiBar';

describe('QuickEmojiBar', () => {
  it('mostra le otto emoji rapide', async () => {
    await render(<QuickEmojiBar onPick={jest.fn()} />);
    expect(screen.getAllByRole('button')).toHaveLength(8);
    for (const { emoji } of QUICK_EMOJIS) expect(screen.getByText(emoji)).toBeOnTheScreen();
  });

  it('ogni emoji ha un’etichetta tradotta per i lettori di schermo', async () => {
    await render(<QuickEmojiBar onPick={jest.fn()} />);
    expect(
      screen.getByRole('button', {
        name: 'ui:quickEmoji.insert({"name":"ui:quickEmoji.names.heart"})',
      }),
    ).toBeOnTheScreen();
    for (const { key } of QUICK_EMOJIS) {
      expect(
        screen.getByLabelText(`ui:quickEmoji.insert({"name":"ui:quickEmoji.names.${key}"})`),
      ).toBeOnTheScreen();
    }
  });

  it('il tocco consegna l’emoji', async () => {
    const onPick = jest.fn();
    await render(<QuickEmojiBar onPick={onPick} />);
    await fireEvent.press(screen.getByText('🔥'));
    expect(onPick).toHaveBeenCalledWith('🔥');
  });

  it('ogni bersaglio è almeno 44 x 44', async () => {
    await render(<QuickEmojiBar onPick={jest.fn()} />);
    const style = screen.getAllByRole('button')[0]?.props.style;
    const flat = Object.assign({}, ...[style].flat(3).filter(Boolean));
    expect(flat.minWidth ?? flat.width).toBeGreaterThanOrEqual(44);
    expect(flat.minHeight ?? flat.height).toBeGreaterThanOrEqual(44);
  });
});
