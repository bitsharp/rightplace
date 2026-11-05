import { fireEvent, render, screen } from '@testing-library/react-native';

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
});
