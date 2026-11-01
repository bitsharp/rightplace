import { render, screen } from '@testing-library/react-native';

import { PasswordStrengthMeter } from './PasswordStrengthMeter';

describe('PasswordStrengthMeter', () => {
  it.each([
    ['abc', 'weak'],
    ['serata24', 'fair'],
    ['Serata-Navigli-2026', 'strong'],
  ])('per "%s" indica %s', async (password, strength) => {
    await render(<PasswordStrengthMeter password={password} />);
    expect(screen.getByText(`auth:password.strength.${strength}`)).toBeOnTheScreen();
  });

  it('non mostra nulla a campo vuoto', async () => {
    await render(<PasswordStrengthMeter password="" />);
    expect(screen.queryByText(/auth:password.strength/)).not.toBeOnTheScreen();
  });
});
