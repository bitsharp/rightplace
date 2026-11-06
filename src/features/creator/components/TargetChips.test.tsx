import { fireEvent, render, screen } from '@testing-library/react-native';

import { TargetChips } from './TargetChips';

describe('TargetChips', () => {
  it('mostra le tre fasce d’età e i tre generi', async () => {
    await render(<TargetChips ages={[]} gender="all" onAges={jest.fn()} onGender={jest.fn()} />);
    for (const key of ['18-24', '25-34', '35+']) {
      expect(screen.getByRole('button', { name: `ui:target.age.${key}` })).toBeOnTheScreen();
    }
    for (const key of ['all', 'female', 'male']) {
      expect(screen.getByRole('button', { name: `ui:target.gender.${key}` })).toBeOnTheScreen();
    }
  });

  it('le età sono multi-selezione: si aggiungono e si tolgono', async () => {
    const onAges = jest.fn();
    await render(
      <TargetChips ages={['18-24']} gender="all" onAges={onAges} onGender={jest.fn()} />,
    );
    await fireEvent.press(screen.getByRole('button', { name: 'ui:target.age.25-34' }));
    expect(onAges).toHaveBeenLastCalledWith(['18-24', '25-34']);
    await fireEvent.press(screen.getByRole('button', { name: 'ui:target.age.18-24' }));
    expect(onAges).toHaveBeenLastCalledWith([]);
  });

  it('il genere è a scelta singola', async () => {
    const onGender = jest.fn();
    await render(<TargetChips ages={[]} gender="all" onAges={jest.fn()} onGender={onGender} />);
    await fireEvent.press(screen.getByRole('button', { name: 'ui:target.gender.female' }));
    expect(onGender).toHaveBeenCalledWith('female');
  });

  it('segna come selezionati solo i chip attivi', async () => {
    await render(
      <TargetChips ages={['35+']} gender="male" onAges={jest.fn()} onGender={jest.fn()} />,
    );
    expect(screen.getByRole('button', { name: 'ui:target.age.35+' })).toBeSelected();
    expect(screen.getByRole('button', { name: 'ui:target.age.18-24' })).not.toBeSelected();
    expect(screen.getByRole('button', { name: 'ui:target.gender.male' })).toBeSelected();
  });
});
