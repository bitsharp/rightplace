import { fireEvent, render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/tokens';

import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('è una casella accessibile con la sua etichetta', async () => {
    await render(<Checkbox label="auth:signUp.consent" checked={false} onChange={jest.fn()} />);
    expect(screen.getByRole('checkbox', { name: 'auth:signUp.consent' })).not.toBeChecked();
  });

  it('si spunta al tocco', async () => {
    const onChange = jest.fn();
    await render(<Checkbox label="x" checked={false} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('checkbox'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('è viola quando spuntata', async () => {
    await render(<Checkbox label="x" checked onChange={jest.fn()} />);
    expect(screen.getByRole('checkbox')).toBeChecked();
    expect(screen.getByTestId('checkbox-box', { includeHiddenElements: true })).toHaveStyle({
      backgroundColor: colors.primary,
    });
  });
});
