import { focusManager } from '@tanstack/react-query';
import { AppState, type AppStateStatus } from 'react-native';

import { createQueryClient } from './queryClient';
import { setupQueryFocus } from './queryFocus';

describe('setupQueryFocus', () => {
  let emit: (status: AppStateStatus) => void = () => undefined;
  const remove = jest.fn();

  beforeEach(() => {
    remove.mockClear();
    jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, listener) => {
      emit = listener;
      return { remove };
    });
  });

  afterEach(() => jest.restoreAllMocks());

  it("segnala il focus quando l'app torna attiva", () => {
    const stop = setupQueryFocus();
    emit('background');
    expect(focusManager.isFocused()).toBe(false);
    emit('active');
    expect(focusManager.isFocused()).toBe(true);
    stop();
  });

  it("segnala la perdita di focus quando l'app va in background", () => {
    const stop = setupQueryFocus();
    emit('background');
    expect(focusManager.isFocused()).toBe(false);
    stop();
  });

  it("rimuove l'ascolto di AppState allo smontaggio", () => {
    const stop = setupQueryFocus();
    stop();
    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe('createQueryClient', () => {
  it('non disattiva il refetch al ritorno in primo piano', () => {
    const queries = createQueryClient().getDefaultOptions().queries;
    expect(queries?.refetchOnWindowFocus).not.toBe(false);
  });
});
