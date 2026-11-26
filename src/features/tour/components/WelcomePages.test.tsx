import { Dimensions } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { spacing } from '@/theme/tokens';

import { WelcomePages } from './WelcomePages';

const NEXT = { name: 'tour:welcome.next' };
const START = { name: 'tour:welcome.start' };

describe('WelcomePages', () => {
  it('mostra la prima pagina con il titolo come header e “Salta” sempre visibile', async () => {
    await render(<WelcomePages review={false} onFinish={jest.fn()} />);
    expect(
      screen.getByRole('header', { name: 'tour:welcome.pages.where.title' }),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'tour:welcome.skip' })).toBeOnTheScreen();
    expect(screen.getByRole('button', NEXT)).toBeOnTheScreen();
  });

  it('“Avanti” porta alle pagine successive e sull’ultima diventa “Inizia”', async () => {
    const onFinish = jest.fn();
    await render(<WelcomePages review={false} onFinish={onFinish} />);
    await fireEvent.press(screen.getByRole('button', NEXT));
    expect(screen.getByLabelText('tour:welcome.pageA11y({"page":2,"total":3})')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', NEXT));
    expect(screen.queryByRole('button', NEXT)).not.toBeOnTheScreen();
    expect(onFinish).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByRole('button', START));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('lo scorrimento con il dito aggiorna i puntini', async () => {
    await render(<WelcomePages review={false} onFinish={jest.fn()} />);
    await fireEvent(screen.getByTestId('welcome-pager'), 'momentumScrollEnd', {
      nativeEvent: {
        contentOffset: { x: 2 * (Dimensions.get('window').width - spacing.xl * 2), y: 0 },
      },
    });
    expect(screen.getByRole('button', START)).toBeOnTheScreen();
  });

  it('“Salta” chiude subito il benvenuto', async () => {
    const onFinish = jest.fn();
    await render(<WelcomePages review={false} onFinish={onFinish} />);
    await fireEvent.press(screen.getByRole('button', { name: 'tour:welcome.skip' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it('la pagina privacy elenca le garanzie: fasce, foto, chat 2 giorni, 7 giorni, posizione', async () => {
    await render(<WelcomePages review={false} onFinish={jest.fn()} />);
    await fireEvent.press(screen.getByRole('button', NEXT));
    await fireEvent.press(screen.getByRole('button', NEXT));
    for (const point of ['bands', 'photo', 'chat', 'posts', 'location']) {
      expect(screen.getByText(`tour:welcome.pages.privacy.points.${point}`)).toBeOnTheScreen();
    }
  });

  it('in modalità rivedi c’è “Chiudi” al posto di “Salta” e un promemoria sui suggerimenti', async () => {
    const onFinish = jest.fn();
    await render(<WelcomePages review onFinish={onFinish} />);
    expect(screen.queryByRole('button', { name: 'tour:welcome.skip' })).not.toBeOnTheScreen();
    expect(screen.queryByText('tour:welcome.reviewToast')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'tour:welcome.close' }));
    expect(onFinish).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByRole('button', NEXT));
    await fireEvent.press(screen.getByRole('button', NEXT));
    expect(screen.getByText('tour:welcome.reviewToast')).toBeOnTheScreen();
  });
});
