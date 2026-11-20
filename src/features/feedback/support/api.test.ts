import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import {
  fetchFeedbackScreenshotUrls,
  fetchSupportFeedbackPage,
  fetchSupportInboxPage,
} from './api';
import { nextSupportCursor, ratingStars, SUPPORT_PAGE_SIZE } from './domain/supportFeedback';

const row = (overrides: Record<string, unknown> = {}) => ({
  id: 'f1',
  rating: 4,
  comment: 'Bella app',
  screen: '/venue/[id]',
  has_screenshot: true,
  app_version: '1.0.0',
  platform: 'ios',
  locale: 'it',
  created_at: '2026-11-21T10:00:00Z',
  author_handle: 'lince.rosso',
  ...overrides,
});

describe('ratingStars', () => {
  it('mostra le stelle piene e vuote del voto', () => {
    expect(ratingStars(4)).toBe('★★★★☆');
    expect(ratingStars(1)).toBe('★☆☆☆☆');
    expect(ratingStars(5)).toBe('★★★★★');
  });
});

describe('nextSupportCursor', () => {
  it('con una pagina piena riparte dalla data dell’ultimo feedback', () => {
    const page = Array.from({ length: SUPPORT_PAGE_SIZE }, (_, i) => ({
      createdAt: `2026-11-21T10:00:${String(59 - i).padStart(2, '0')}Z`,
    }));
    expect(nextSupportCursor(page as never)).toBe(page.at(-1)?.createdAt);
  });

  it('con una pagina incompleta non ce ne sono altre', () => {
    expect(nextSupportCursor([{ createdAt: 'x' }] as never)).toBeUndefined();
  });
});

describe('fetchSupportFeedbackPage', () => {
  it('chiama get_support_feedback e converte le righe', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: [row()], error: null });
    await expect(fetchSupportFeedbackPage('2026-11-22T00:00:00Z')).resolves.toEqual([
      {
        id: 'f1',
        rating: 4,
        comment: 'Bella app',
        screen: '/venue/[id]',
        hasScreenshot: true,
        appVersion: '1.0.0',
        platform: 'ios',
        locale: 'it',
        createdAt: '2026-11-21T10:00:00Z',
        authorHandle: 'lince.rosso',
      },
    ]);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_support_feedback', {
      p_before: '2026-11-22T00:00:00Z',
      p_limit: SUPPORT_PAGE_SIZE,
    });
  });

  it('la prima pagina parte senza data', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: [], error: null });
    await fetchSupportFeedbackPage(undefined);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_support_feedback', {
      p_before: null,
      p_limit: SUPPORT_PAGE_SIZE,
    });
  });

  it('NOT_SUPPORT diventa un errore tipizzato', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'NOT_SUPPORT' } });
    await expect(fetchSupportFeedbackPage(undefined)).rejects.toBeInstanceOf(RpcError);
  });
});

describe('fetchFeedbackScreenshotUrls', () => {
  it('senza id non chiama la rete', async () => {
    await expect(fetchFeedbackScreenshotUrls([])).resolves.toEqual({});
    expect(fakeSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('chiede gli URL firmati all’Edge Function feedback-screenshot-urls', async () => {
    fakeSupabase.functions.invoke.mockResolvedValueOnce({
      data: { urls: [{ feedbackId: 'f1', url: 'https://signed.test/f1' }] },
      error: null,
    });
    await expect(fetchFeedbackScreenshotUrls(['f1'])).resolves.toEqual({
      f1: 'https://signed.test/f1',
    });
    expect(fakeSupabase.functions.invoke).toHaveBeenCalledWith('feedback-screenshot-urls', {
      body: { feedbackIds: ['f1'] },
    });
  });

  it('un errore dell’Edge Function diventa un errore tipizzato', async () => {
    fakeSupabase.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    await expect(fetchFeedbackScreenshotUrls(['f1'])).rejects.toBeInstanceOf(RpcError);
  });
});

describe('fetchSupportInboxPage', () => {
  it('unisce a ogni feedback l’URL firmato del suo screenshot', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({
      data: [row(), row({ id: 'f2', has_screenshot: false })],
      error: null,
    });
    fakeSupabase.functions.invoke.mockResolvedValueOnce({
      data: { urls: [{ feedbackId: 'f1', url: 'https://signed.test/f1' }] },
      error: null,
    });
    const items = await fetchSupportInboxPage(undefined);
    expect(items.map((item) => item.screenshotUrl)).toEqual(['https://signed.test/f1', null]);
    expect(fakeSupabase.functions.invoke).toHaveBeenCalledWith('feedback-screenshot-urls', {
      body: { feedbackIds: ['f1'] },
    });
  });

  it('se gli URL non si firmano la lista c’è lo stesso, senza miniature', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: [row()], error: null });
    fakeSupabase.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: 'x' } });
    const items = await fetchSupportInboxPage(undefined);
    expect(items).toHaveLength(1);
    expect(items[0]?.screenshotUrl).toBeNull();
  });
});
