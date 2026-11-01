import { render, screen } from '@testing-library/react-native';

import { colors } from '@/theme/tokens';

import { AgeStatCard } from './AgeStatCard';
import { GenderBar } from './GenderBar';

describe('GenderBar', () => {
  it('trasforma le percentuali in larghezze con i colori del genere', async () => {
    await render(<GenderBar femalePct={52} malePct={48} />);
    expect(screen.getByTestId('gender-female', { includeHiddenElements: true })).toHaveStyle({
      width: '52%',
      backgroundColor: colors.female,
    });
    expect(screen.getByTestId('gender-male', { includeHiddenElements: true })).toHaveStyle({
      width: '48%',
      backgroundColor: colors.male,
    });
  });

  it('descrive la barra agli screen reader', async () => {
    await render(<GenderBar femalePct={61} malePct={39} />);
    expect(screen.getByLabelText('ui:gender.a11y({"female":61,"male":39})')).toBeOnTheScreen();
  });

  it('mostra la legenda con le percentuali', async () => {
    await render(<GenderBar femalePct={61} malePct={39} />);
    expect(screen.getByText('ui:gender.female({"pct":61})')).toBeOnTheScreen();
    expect(screen.getByText('ui:gender.male({"pct":39})')).toBeOnTheScreen();
  });

  it('non supera mai il 100% anche con dati incoerenti', async () => {
    await render(<GenderBar femalePct={80} malePct={40} />);
    expect(screen.getByTestId('gender-male', { includeHiddenElements: true })).toHaveStyle({
      width: '20%',
    });
  });
});

describe('AgeStatCard', () => {
  it('mostra l’età media arrotondata', async () => {
    await render(<AgeStatCard averageAge={24.6} />);
    expect(screen.getByText('ui:age.average')).toBeOnTheScreen();
    expect(screen.getByText('ui:age.years({"age":25})')).toBeOnTheScreen();
  });
});
