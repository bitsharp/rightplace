import { RpcError, rpcErrorCodeOf, toRpcErrorCode } from './rpcError';

describe('toRpcErrorCode', () => {
  it('riconosce i codici sollevati dalle RPC', () => {
    expect(toRpcErrorCode({ message: 'UNDERAGE', code: 'P0001' })).toBe('UNDERAGE');
    expect(toRpcErrorCode({ message: 'HANDLE_ALREADY_CHANGED', code: 'P0001' })).toBe(
      'HANDLE_ALREADY_CHANGED',
    );
  });

  it('riconosce i codici della chat di serata', () => {
    for (const code of ['NOT_ROOM_MEMBER', 'INVALID_MESSAGE', 'INVALID_PHOTO_PATH']) {
      expect(toRpcErrorCode({ message: code, code: 'P0001' })).toBe(code);
    }
  });

  it('riconosce i codici di post, feed e commenti', () => {
    for (const code of [
      'NO_RECENT_DECLARATION',
      'INVALID_POST',
      'INVALID_COMMENT',
      'POST_NOT_FOUND',
    ]) {
      expect(toRpcErrorCode({ message: code, code: 'P0001' })).toBe(code);
    }
  });

  it('distingue gli errori di rete', () => {
    expect(toRpcErrorCode(new TypeError('Network request failed'))).toBe('NETWORK');
  });

  it('non inventa codici per messaggi sconosciuti', () => {
    expect(toRpcErrorCode({ message: 'syntax error', code: '42601' })).toBe('UNKNOWN');
    expect(toRpcErrorCode(undefined)).toBe('UNKNOWN');
  });
});

describe('rpcErrorCodeOf', () => {
  it('nessun errore: nessun codice', () => {
    expect(rpcErrorCodeOf(null)).toBeNull();
    expect(rpcErrorCodeOf(undefined)).toBeNull();
  });

  it('un RpcError porta il suo codice, qualunque altro errore è UNKNOWN', () => {
    expect(rpcErrorCodeOf(new RpcError('POST_NOT_FOUND'))).toBe('POST_NOT_FOUND');
    expect(rpcErrorCodeOf(new Error('boom'))).toBe('UNKNOWN');
  });
});
