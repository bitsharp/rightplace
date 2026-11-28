import { render, screen } from '@testing-library/react-native';

import { VenueCoverArt } from './VenueCoverArt';

const placeholder = require('../../../assets/images/venue-placeholder.webp') as number;

describe('VenueCoverArt', () => {
  it.each(['club', 'rooftop', 'bar', 'live', 'other', 'spot', 'casino'])(
    'il locale di tipo %s mostra la stessa illustrazione segnaposto',
    async (kind) => {
      await render(<VenueCoverArt kind={kind} />);
      expect(screen.getByTestId('venue-cover-art')).toBeOnTheScreen();
      const image = screen.getByTestId('venue-cover-art-image', { includeHiddenElements: true });
      expect(image.props.source).toEqual([placeholder]);
      expect(image).toHaveProp('contentFit', 'cover');
    },
  );

  it('descrive l’illustrazione a voce', async () => {
    await render(<VenueCoverArt kind="club" />);
    expect(screen.getByLabelText('ui:coverArt.label')).toBeOnTheScreen();
  });

  it('non dichiara mai di essere una foto di Google Maps', async () => {
    await render(<VenueCoverArt kind="bar" />);
    expect(screen.queryByText('venue:cover.caption')).toBeNull();
    expect(screen.queryByLabelText('venue:cover.caption')).toBeNull();
  });
});
