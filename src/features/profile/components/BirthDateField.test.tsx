import { fireEvent, render, screen } from '@testing-library/react-native';

import { BirthDateField } from './BirthDateField';

const EMPTY = { day: '', month: '', year: '' };

describe('BirthDateField', () => {
  it('ha tre campi numerici etichettati', async () => {
    await render(<BirthDateField value={EMPTY} onChange={jest.fn()} />);
    expect(screen.getByText('profile:form.birthDate')).toBeOnTheScreen();
    expect(screen.getByLabelText('profile:form.day')).toHaveProp('keyboardType', 'number-pad');
    expect(screen.getByLabelText('profile:form.month')).toHaveProp('maxLength', 2);
    expect(screen.getByLabelText('profile:form.year')).toHaveProp('maxLength', 4);
  });

  it('aggiorna solo la parte modificata e scarta i caratteri non numerici', async () => {
    const onChange = jest.fn();
    await render(<BirthDateField value={{ day: '7', month: '', year: '' }} onChange={onChange} />);
    await fireEvent.changeText(screen.getByLabelText('profile:form.month'), '0a3');
    expect(onChange).toHaveBeenCalledWith({ day: '7', month: '03', year: '' });
  });
});
