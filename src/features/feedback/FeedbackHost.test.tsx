import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { StyleSheet } from 'react-native';

import { RpcError } from '@/lib/rpcError';
import { createQueryWrapper } from '@/test/queryWrapper';

import { FeedbackHost } from './FeedbackHost';
import { sendFeedback } from './sendFeedback';
import { resetFeedback, useFeedback } from './store/feedbackStore';

jest.mock('./sendFeedback', () => ({ sendFeedback: jest.fn() }));
jest.mock('@/features/auth/useSession', () => ({ useSession: () => ({ userId: 'me' }) }));
jest.mock('expo-constants', () => ({ expoConfig: { version: '0.1.0' } }));

const send = jest.mocked(sendFeedback);

async function renderHost() {
  const { Wrapper } = createQueryWrapper();
  await render(<FeedbackHost />, { wrapper: Wrapper });
}

const openDraft = (screenshotUri: string | null = 'file:///s.jpg') =>
  act(() => useFeedback.getState().open({ screen: '/venue/[id]', screenshotUri }));

const sendButton = () => screen.getByRole('button', { name: 'feedback:send' });

describe('FeedbackHost', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetFeedback();
    send.mockResolvedValue(undefined);
  });

  it('senza bozza non mostra il foglio', async () => {
    await renderHost();
    expect(screen.queryByText('feedback:title')).not.toBeOnTheScreen();
  });

  it('mostra anteprima, stelle, contatore e la nota sulla privacy dello screenshot', async () => {
    await renderHost();
    await openDraft();
    expect(screen.getByText('feedback:title')).toBeOnTheScreen();
    expect(screen.getByLabelText('feedback:screenshotA11y')).toBeOnTheScreen();
    expect(screen.getAllByRole('button', { name: /^feedback:starA11y/ })).toHaveLength(5);
    expect(screen.getByText('feedback:privacyNote')).toBeOnTheScreen();
    expect(screen.getByText('feedback:counter({"count":1000})')).toBeOnTheScreen();
  });

  it('lo screenshot è una miniatura compatta di 140 pt, intera (contain), e il titolo sta su 2 righe', async () => {
    await renderHost();
    await openDraft();
    const thumb = screen.getByLabelText('feedback:screenshotA11y');
    expect(thumb.props.contentFit).toBe('contain');
    expect(StyleSheet.flatten(thumb.props.style).height).toBe(140);
    expect(screen.getByText('feedback:title').props.numberOfLines).toBe(2);
    expect(screen.getByRole('button', { name: 'feedback:removeScreenshot' })).toBeOnTheScreen();
  });

  it('le stelle sono obbligatorie: senza voto il bottone Invia è disattivato', async () => {
    await renderHost();
    await openDraft();
    expect(sendButton().props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: 'feedback:starA11y({"count":4})' }));
    expect(sendButton().props.accessibilityState.disabled).toBe(false);
  });

  it('invia screenshot, voto, commento, schermata, versione, piattaforma e lingua', async () => {
    await renderHost();
    await openDraft();
    await fireEvent.press(screen.getByRole('button', { name: 'feedback:starA11y({"count":5})' }));
    await fireEvent.changeText(screen.getByLabelText('feedback:commentLabel'), 'Bellissima');
    await fireEvent.press(sendButton());
    await waitFor(() => expect(send).toHaveBeenCalled());
    expect(send).toHaveBeenCalledWith({
      userId: 'me',
      rating: 5,
      comment: 'Bellissima',
      screen: '/venue/[id]',
      screenshotUri: 'file:///s.jpg',
      appVersion: '0.1.0',
      platform: 'ios',
      locale: 'it',
    });
  });

  it('dopo l’invio chiude il foglio e mostra il ringraziamento', async () => {
    await renderHost();
    await openDraft();
    await fireEvent.press(screen.getByRole('button', { name: 'feedback:starA11y({"count":3})' }));
    await fireEvent.press(sendButton());
    await waitFor(() => expect(screen.getByText('feedback:thanks')).toBeOnTheScreen());
    expect(useFeedback.getState().draft).toBeNull();
  });

  it('"Rimuovi screenshot" invia senza screenshot', async () => {
    await renderHost();
    await openDraft();
    await fireEvent.press(screen.getByRole('button', { name: 'feedback:removeScreenshot' }));
    expect(screen.queryByLabelText('feedback:screenshotA11y')).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'feedback:starA11y({"count":2})' }));
    await fireEvent.press(sendButton());
    await waitFor(() => expect(send).toHaveBeenCalled());
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ screenshotUri: null }));
  });

  it('senza screenshot disponibile non mostra l’anteprima', async () => {
    await renderHost();
    await openDraft(null);
    expect(screen.queryByLabelText('feedback:screenshotA11y')).not.toBeOnTheScreen();
    expect(
      screen.queryByRole('button', { name: 'feedback:removeScreenshot' }),
    ).not.toBeOnTheScreen();
  });

  it('mostra l’errore tradotto, anche il limite giornaliero, e resta aperto', async () => {
    send.mockRejectedValue(new RpcError('FEEDBACK_LIMIT'));
    await renderHost();
    await openDraft();
    await fireEvent.press(screen.getByRole('button', { name: 'feedback:starA11y({"count":3})' }));
    await fireEvent.press(sendButton());
    await waitFor(() => expect(screen.getByText('errors:rpc.FEEDBACK_LIMIT')).toBeOnTheScreen());
    expect(useFeedback.getState().draft).not.toBeNull();
  });

  it('chiudendo senza inviare scarta la bozza e non invia nulla', async () => {
    await renderHost();
    await openDraft();
    await fireEvent.press(screen.getByRole('button', { name: 'feedback:cancel' }));
    expect(useFeedback.getState().draft).toBeNull();
    expect(send).not.toHaveBeenCalled();
  });
});
