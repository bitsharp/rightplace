import { fireEvent, render, screen } from '@testing-library/react-native';

import { AvatarSheet } from './AvatarSheet';

const noop = jest.fn();

describe('AvatarSheet', () => {
  it('offre fotocamera e galleria e dice chi vedrà la foto', async () => {
    const onPick = jest.fn();
    await render(
      <AvatarSheet visible hasPhoto={false} onPick={onPick} onRemove={noop} onClose={noop} />,
    );
    expect(screen.getByText('profile:avatar.hint')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('ui:photoSource.camera'));
    expect(onPick).toHaveBeenCalledWith('camera');
    await fireEvent.press(screen.getByText('ui:photoSource.library'));
    expect(onPick).toHaveBeenCalledWith('library');
  });

  it('senza foto non propone di rimuoverla', async () => {
    await render(
      <AvatarSheet visible hasPhoto={false} onPick={noop} onRemove={noop} onClose={noop} />,
    );
    expect(screen.queryByText('profile:avatar.remove')).toBeNull();
  });

  it('con una foto propone Rimuovi foto', async () => {
    const onRemove = jest.fn();
    await render(<AvatarSheet visible hasPhoto onPick={noop} onRemove={onRemove} onClose={noop} />);
    await fireEvent.press(screen.getByText('profile:avatar.remove'));
    expect(onRemove).toHaveBeenCalled();
  });

  it('Annulla chiude senza scegliere', async () => {
    const onClose = jest.fn();
    const onPick = jest.fn();
    await render(
      <AvatarSheet visible hasPhoto={false} onPick={onPick} onRemove={noop} onClose={onClose} />,
    );
    await fireEvent.press(screen.getByText('ui:photoSource.cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });
});
