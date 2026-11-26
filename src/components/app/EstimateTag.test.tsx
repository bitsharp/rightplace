import { render, screen } from '@testing-library/react-native';

import { EstimateTag } from './EstimateTag';

describe('EstimateTag', () => {
  it('mostra l’etichetta STIMA con il testo accessibile che spiega cosa include', async () => {
    await render(<EstimateTag />);
    expect(screen.getByText('ui:estimate.tag')).toBeOnTheScreen();
    expect(screen.getByLabelText('ui:estimate.a11y')).toBeOnTheScreen();
  });
});
