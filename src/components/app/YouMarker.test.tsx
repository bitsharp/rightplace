import { render, screen } from '@testing-library/react-native';

import { YouMarker } from './YouMarker';

describe('YouMarker', () => {
  it('si annuncia come "Tu"', async () => {
    await render(<YouMarker />);
    expect(screen.getByLabelText('ui:you')).toBeOnTheScreen();
  });
});
