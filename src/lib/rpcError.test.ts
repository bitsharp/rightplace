import { toRpcErrorCode } from './rpcError';

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

  it('distingue gli errori di rete', () => {
    expect(toRpcErrorCode(new TypeError('Network request failed'))).toBe('NETWORK');
  });

  it('non inventa codici per messaggi sconosciuti', () => {
    expect(toRpcErrorCode({ message: 'syntax error', code: '42601' })).toBe('UNKNOWN');
    expect(toRpcErrorCode(undefined)).toBe('UNKNOWN');
  });
});
