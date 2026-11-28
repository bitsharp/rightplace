import { fireEvent, render, screen } from '@testing-library/react-native';

import type { DeclarationState } from '../domain/declarationState';

import { DeclareCta } from './DeclareCta';

const none: DeclarationState = { kind: 'none' };
const here: DeclarationState = {
  kind: 'here',
  intent: 'going',
  expiresAt: '2026-11-29T05:00:00Z',
};
const elsewhere: DeclarationState = { kind: 'elsewhere', venueName: 'Arena Club' };

describe('DeclareCta', () => {
  it('senza dichiarazione dice "Dichiara la tua serata" e apre la dichiarazione', async () => {
    const onPress = jest.fn();
    await render(<DeclareCta state={none} onPress={onPress} />);
    await fireEvent.press(screen.getByRole('button', { name: 'venue:cta' }));
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('venue:ctaStatus.going')).toBeNull();
  });

  it('se ho già dichiarato qui diventa "Modifica la tua serata", con lo stato sopra', async () => {
    const onPress = jest.fn();
    await render(<DeclareCta state={here} onPress={onPress} />);
    expect(screen.queryByRole('button', { name: 'venue:cta' })).toBeNull();
    expect(screen.getByText('venue:ctaStatus.going')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'venue:ctaChange' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('il Forse mostra lo stato Forse', async () => {
    await render(<DeclareCta state={{ ...here, intent: 'maybe' }} onPress={jest.fn()} />);
    expect(screen.getByText('venue:ctaStatus.maybe')).toBeOnTheScreen();
  });

  it('se ho dichiarato in un altro locale diventa "Sposta qui la tua serata"', async () => {
    const onPress = jest.fn();
    await render(<DeclareCta state={elsewhere} onPress={onPress} />);
    expect(screen.queryByText('venue:ctaStatus.going')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'venue:ctaMove' }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('da disattivata (serata annullata) non fa nulla', async () => {
    const onPress = jest.fn();
    await render(<DeclareCta state={none} onPress={onPress} disabled />);
    await fireEvent.press(screen.getByRole('button', { name: 'venue:cta' }));
    expect(onPress).not.toHaveBeenCalled();
  });
});
