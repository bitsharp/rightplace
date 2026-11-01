import { render, screen } from '@testing-library/react-native';

import { Toast } from './Toast';

describe('Toast', () => {
  it('annuncia il messaggio agli screen reader', async () => {
    await render(<Toast message="creator:billing.confirmed" />);
    expect(screen.getByRole('alert')).toHaveTextContent('creator:billing.confirmed');
  });

  it('mostra la spunta nel tono di successo', async () => {
    await render(<Toast message="m" tone="success" />);
    expect(screen.getByTestId('icon-check', { includeHiddenElements: true })).toBeOnTheScreen();
  });
});
