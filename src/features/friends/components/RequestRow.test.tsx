import { fireEvent, render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

import type { FollowRequest } from '../api';

import { RequestRow } from './RequestRow';

const request: FollowRequest = {
  userId: 'u1',
  handle: 'volpe.viola',
  ageBand: '18-24',
  gender: 'female',
  isCreator: false,
  requestedAt: '2026-11-03T10:00:00Z',
};

describe('RequestRow', () => {
  it('mostra solo handle e fascia di chi chiede di seguirti', async () => {
    await render(<RequestRow request={request} onAccept={jest.fn()} onDecline={jest.fn()} />);
    expect(screen.getByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText(/friends:meta/)).toBeOnTheScreen();
  });

  it('Accetta chiama onAccept con l’id del richiedente', async () => {
    const onAccept = jest.fn();
    await render(<RequestRow request={request} onAccept={onAccept} onDecline={jest.fn()} />);
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'friends:requests.a11yAccept({"handle":"@volpe.viola"})',
      }),
    );
    expect(onAccept).toHaveBeenCalledWith('u1');
  });

  it('Rifiuta chiama onDecline e non accetta', async () => {
    const onAccept = jest.fn();
    const onDecline = jest.fn();
    await render(<RequestRow request={request} onAccept={onAccept} onDecline={onDecline} />);
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'friends:requests.a11yDecline({"handle":"@volpe.viola"})',
      }),
    );
    expect(onDecline).toHaveBeenCalledWith('u1');
    expect(onAccept).not.toHaveBeenCalled();
  });

  describe('layout a 320 pt', () => {
    it('l’handle e la meta restano su una riga con ellissi', async () => {
      await render(<RequestRow request={request} onAccept={jest.fn()} onDecline={jest.fn()} />);
      const handle = screen.getByText('@volpe.viola');
      expect(handle.props.numberOfLines).toBe(1);
      expect(handle.props.ellipsizeMode).toBe('tail');
      expect(screen.getByText(/friends:meta/).props.numberOfLines).toBe(1);
    });

    it('il blocco testo può restringersi (flex 1, minWidth 0)', async () => {
      await render(<RequestRow request={request} onAccept={jest.fn()} onDecline={jest.fn()} />);
      const texts = screen.getByText('@volpe.viola').parent;
      expect(StyleSheet.flatten(texts?.props.style)).toMatchObject({ flex: 1, minWidth: 0 });
    });

    it('i bottoni stanno sotto il testo, non nella sua riga', async () => {
      await render(<RequestRow request={request} onAccept={jest.fn()} onDecline={jest.fn()} />);
      const actions = screen.getByTestId('request-actions');
      expect(StyleSheet.flatten(actions.props.style)).toMatchObject({ flexDirection: 'row' });
      const textRow = screen.getByText('@volpe.viola').parent?.parent;
      expect(actions.parent).not.toBe(textRow);
      expect(screen.getByTestId('request-row')).toHaveStyle({ flexDirection: 'column' });
    });
  });
});
