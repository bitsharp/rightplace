import { fireEvent, render, screen } from '@testing-library/react-native';

import { VenueCoverImage } from './VenueCoverImage';

const URL_OK = 'https://lh3.googleusercontent.com/p/abc=w200';

describe('VenueCoverImage', () => {
  it('senza URL mostra il segnaposto del tipo e nessuna etichetta Google', async () => {
    await render(<VenueCoverImage url={null} kind="rooftop" />);
    expect(screen.getByTestId('venue-cover-art-rooftop')).toBeOnTheScreen();
    expect(screen.queryByLabelText('venue:cover.caption')).toBeNull();
  });

  it('con l’URL mostra la foto con l’etichetta "Foto da Google Maps"', async () => {
    await render(<VenueCoverImage url={URL_OK} kind="rooftop" />);
    expect(screen.getByLabelText('venue:cover.caption')).toBeOnTheScreen();
    expect(screen.queryByTestId('venue-cover-art-rooftop')).toBeNull();
  });

  it('se il caricamento fallisce torna al segnaposto e toglie l’etichetta Google', async () => {
    await render(<VenueCoverImage url={URL_OK} kind="live" />);
    await fireEvent(screen.getByLabelText('venue:cover.caption'), 'error', {
      nativeEvent: { error: 'boom' },
    });
    expect(screen.getByTestId('venue-cover-art-live')).toBeOnTheScreen();
    expect(screen.queryByLabelText('venue:cover.caption')).toBeNull();
  });
});
