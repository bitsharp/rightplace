import { fireEvent, render, screen } from '@testing-library/react-native';

import { PhotoSourceSheet } from './PhotoSourceSheet';

describe('PhotoSourceSheet', () => {
  it('offre fotocamera e galleria, e chiude dopo la scelta', async () => {
    const onPick = jest.fn();
    const onClose = jest.fn();
    await render(<PhotoSourceSheet visible onPick={onPick} onClose={onClose} />);
    await fireEvent.press(screen.getByText('chat:photoSource.camera'));
    expect(onPick).toHaveBeenCalledWith('camera');
    await fireEvent.press(screen.getByText('chat:photoSource.library'));
    expect(onPick).toHaveBeenCalledWith('library');
  });

  it('annulla chiude senza scegliere', async () => {
    const onPick = jest.fn();
    const onClose = jest.fn();
    await render(<PhotoSourceSheet visible onPick={onPick} onClose={onClose} />);
    await fireEvent.press(screen.getByText('chat:photoSource.cancel'));
    expect(onClose).toHaveBeenCalled();
    expect(onPick).not.toHaveBeenCalled();
  });

  it('passa onDismiss al foglio, che lo inoltra al Modal', async () => {
    const onDismiss = jest.fn();
    await render(
      <PhotoSourceSheet visible onPick={jest.fn()} onClose={jest.fn()} onDismiss={onDismiss} />,
    );
    await fireEvent(screen.getByTestId('sheet-panel', { includeHiddenElements: true }), 'dismiss');
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
