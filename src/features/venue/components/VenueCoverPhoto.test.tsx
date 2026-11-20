import { fireEvent, render, screen } from '@testing-library/react-native';

import { VenueCoverPhoto } from './VenueCoverPhoto';

const URL_OK = 'https://lh3.googleusercontent.com/p/abc=w800';

describe('VenueCoverPhoto', () => {
  it('senza foto non mostra nulla: il layout resta com’è', async () => {
    await render(<VenueCoverPhoto photoUrl={null} />);
    expect(screen.queryByTestId('venue-cover-photo')).toBeNull();
    expect(screen.queryByText('venue:cover.caption')).toBeNull();
  });

  it('mostra la foto 16:9 con la didascalia "Foto da Google Maps"', async () => {
    await render(<VenueCoverPhoto photoUrl={URL_OK} />);
    expect(screen.getByTestId('venue-cover-image').props.source).toEqual([{ uri: URL_OK }]);
    expect(screen.getByTestId('venue-cover-photo').props.style).toMatchObject({
      aspectRatio: 16 / 9,
    });
    expect(screen.getByText('venue:cover.caption')).toBeOnTheScreen();
  });

  it('è una copertina pubblica: cache in memoria e su disco', async () => {
    await render(<VenueCoverPhoto photoUrl={URL_OK} />);
    expect(screen.getByTestId('venue-cover-image').props.cachePolicy).toBe('memory-disk');
    expect(screen.getByTestId('venue-cover-image').props.contentFit).toBe('cover');
  });

  it('un errore di caricamento nasconde la foto e la didascalia', async () => {
    await render(<VenueCoverPhoto photoUrl={URL_OK} />);
    await fireEvent(screen.getByTestId('venue-cover-image'), 'error', {
      nativeEvent: { error: 'boom' },
    });
    expect(screen.queryByTestId('venue-cover-photo')).toBeNull();
    expect(screen.queryByText('venue:cover.caption')).toBeNull();
  });

  it('il tocco apre il visualizzatore con quella sola foto', async () => {
    await render(<VenueCoverPhoto photoUrl={URL_OK} />);
    expect(screen.queryByText(/ui:photoViewer.counter/)).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'venue:cover.open' }));
    expect(screen.getByText('ui:photoViewer.counter({"current":1,"total":1})')).toBeOnTheScreen();
  });
});
