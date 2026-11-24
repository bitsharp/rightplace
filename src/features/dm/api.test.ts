import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import {
  dmErrorOf,
  fetchDmMessages,
  fetchDmThreads,
  fetchDmUnreadCount,
  markDmRead,
  openDmThread,
  reportDm,
  sendDm,
} from './api';

const respondWith = (data: unknown, error: unknown = null) =>
  fakeSupabase.rpc.mockResolvedValueOnce({ data, error });

describe('fetchDmThreads', () => {
  it('chiama get_dm_threads e converte le righe', async () => {
    respondWith([
      {
        thread_id: 't1',
        other_user_id: 'u2',
        other_handle: 'volpe.viola',
        last_text: 'ciao',
        last_message_at: '2026-11-24T20:00:00Z',
        last_sender_is_me: false,
        unread: true,
      },
    ]);
    await expect(fetchDmThreads()).resolves.toEqual([
      {
        threadId: 't1',
        otherUserId: 'u2',
        otherHandle: 'volpe.viola',
        lastText: 'ciao',
        lastMessageAt: '2026-11-24T20:00:00Z',
        lastSenderIsMe: false,
        unread: true,
      },
    ]);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_dm_threads', undefined);
  });

  it('rifiuta una risposta che non rispetta il contratto', async () => {
    respondWith([{ thread_id: 't1' }]);
    await expect(fetchDmThreads()).rejects.toThrow();
  });
});

describe('fetchDmMessages', () => {
  it('converte i messaggi e passa il cursore', async () => {
    respondWith([
      {
        id: 'm1',
        sender_is_me: true,
        sender_id: 'me',
        text: 'ciao',
        created_at: '2026-11-24T20:00:00Z',
      },
    ]);
    await expect(fetchDmMessages('t1', '2026-11-24T21:00:00Z')).resolves.toEqual([
      { id: 'm1', senderId: 'me', isMine: true, text: 'ciao', createdAt: '2026-11-24T20:00:00Z' },
    ]);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_dm_messages', {
      p_thread: 't1',
      p_before: '2026-11-24T21:00:00Z',
      p_limit: 50,
    });
  });
});

describe('scritture', () => {
  it('sendDm restituisce id e ora del messaggio salvato', async () => {
    respondWith([{ id: 'm9', created_at: '2026-11-24T20:01:00Z' }]);
    await expect(sendDm('t1', 'ciao')).resolves.toEqual({
      id: 'm9',
      createdAt: '2026-11-24T20:01:00Z',
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('send_dm', { p_thread: 't1', p_text: 'ciao' });
  });

  it('openDmThread passa l’handle e restituisce l’id del thread', async () => {
    respondWith('t1');
    await expect(openDmThread('volpe.viola')).resolves.toBe('t1');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('open_dm_thread', { p_handle: 'volpe.viola' });
  });

  it('markDmRead e reportDm usano le RPC giuste (la segnalazione è di tipo dm)', async () => {
    respondWith(null);
    await markDmRead('t1');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('mark_dm_read', { p_thread: 't1' });
    respondWith(null);
    await reportDm('m1');
    expect(fakeSupabase.rpc).toHaveBeenLastCalledWith('report', {
      p_target_kind: 'dm',
      p_target_id: 'm1',
      p_reason: null,
    });
  });
});

describe('fetchDmUnreadCount', () => {
  it('legge il numero di conversazioni non lette', async () => {
    respondWith(3);
    await expect(fetchDmUnreadCount()).resolves.toBe(3);
  });

  it('prima della migration sul server (RPC assente) non rompe nulla: zero', async () => {
    respondWith(null, { message: 'function public.get_dm_unread_count() does not exist' });
    await expect(fetchDmUnreadCount()).resolves.toBe(0);
  });
});

describe('dmErrorOf', () => {
  it.each(['NOT_LINKED', 'RATE_LIMITED', 'INVALID_TEXT'] as const)('%s resta %s', (code) => {
    expect(dmErrorOf(new RpcError(code))).toBe(code);
  });

  it('ogni altro errore diventa UNKNOWN', () => {
    expect(dmErrorOf(new RpcError('NETWORK'))).toBe('UNKNOWN');
    expect(dmErrorOf(new Error('boh'))).toBe('UNKNOWN');
    expect(dmErrorOf(null)).toBe('UNKNOWN');
  });

  it('un errore del server dell’RPC arriva come NOT_LINKED', async () => {
    respondWith(null, { message: 'NOT_LINKED' });
    const error = await sendDm('t1', 'x').catch((caught: unknown) => caught);
    expect(dmErrorOf(error)).toBe('NOT_LINKED');
  });
});
