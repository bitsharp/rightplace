import { render, screen } from '@testing-library/react-native';

import { PhotoStrip } from './PhotoStrip';

describe('PhotoStrip', () => {
  it('mostra il conteggio e una miniatura per foto', async () => {
    await render(
      <PhotoStrip
        photos={[
          { id: 'm1', handle: 'volpe.viola', uri: 'https://signed.test/a' },
          { id: 'm2', handle: 'lince.rosso', uri: 'https://signed.test/b' },
        ]}
      />,
    );
    expect(screen.getByText('chat:photos({"count":2})')).toBeOnTheScreen();
    expect(screen.getAllByLabelText(/chat:photoThumb/)).toHaveLength(2);
  });

  it("finché l'URL firmato non arriva mostra il segnaposto sfumato", async () => {
    await render(<PhotoStrip photos={[{ id: 'm1', handle: 'volpe.viola' }]} />);
    expect(
      screen.getByTestId('photo-placeholder', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('senza foto la striscia non compare', async () => {
    await render(<PhotoStrip photos={[]} />);
    expect(screen.queryByText(/chat:photos/)).toBeNull();
  });
});
