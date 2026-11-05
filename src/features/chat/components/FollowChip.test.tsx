import { fireEvent, render, screen } from '@testing-library/react-native';

import { FollowChip } from './FollowChip';

describe('FollowChip', () => {
  it('propone di seguire chi è stato taggato senza essere seguito', async () => {
    const onFollow = jest.fn();
    await render(<FollowChip handle="orso.verde" requested={false} onFollow={onFollow} />);
    expect(screen.getByText('@orso.verde')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('chat:composer.follow'));
    expect(onFollow).toHaveBeenCalledWith('orso.verde');
  });

  it('dopo la richiesta mostra lo stato e non si può ripremere', async () => {
    const onFollow = jest.fn();
    await render(<FollowChip handle="orso.verde" requested onFollow={onFollow} />);
    expect(screen.getByText('chat:composer.requested')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('chat:composer.requested'));
    expect(onFollow).not.toHaveBeenCalled();
  });
});
