import { RpcError } from '@/lib/rpcError';
import { fakeProfileRow, fakeSupabase, setFakeTable } from '@/test/fakeSupabase';

import {
  completeProfile,
  checkHandleAvailability,
  deleteMyAccount,
  fetchMyProfile,
  regenerateHandle,
  setHandle,
  setLocale,
} from './api';

describe('profile api', () => {
  it('legge e converte il proprio profilo', async () => {
    setFakeTable('profiles', [fakeProfileRow({ is_creator: true })]);
    await expect(fetchMyProfile('user-1')).resolves.toMatchObject({
      id: 'user-1',
      handle: 'lince.rosso',
      birthDate: '2000-05-10',
      gender: 'female',
      locale: 'it',
      isCreator: true,
      handleChangedAt: null,
      deleted: false,
    });
  });

  it('restituisce null se il profilo non esiste', async () => {
    await expect(fetchMyProfile('nessuno')).resolves.toBeNull();
  });

  it('rifiuta righe con forma inattesa', async () => {
    setFakeTable('profiles', [fakeProfileRow({ gender: 'robot' })]);
    await expect(fetchMyProfile('user-1')).rejects.toThrow();
  });

  it('completa il profilo con la RPC', async () => {
    await completeProfile({
      birthDate: '2000-05-10',
      gender: 'male',
      locale: 'en',
      locationOptIn: true,
      contactsOptIn: false,
      isCreator: false,
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('complete_profile', {
      p_birth_date: '2000-05-10',
      p_gender: 'male',
      p_city_slug: 'milano',
      p_locale: 'en',
      p_location_opt_in: true,
      p_contacts_opt_in: false,
      p_is_creator: false,
    });
  });

  it('trasforma UNDERAGE in un errore tipizzato', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'UNDERAGE', code: 'P0001' },
    });
    const error = await completeProfile({
      birthDate: '2010-01-01',
      gender: 'female',
      locale: 'it',
      locationOptIn: false,
      contactsOptIn: false,
      isCreator: false,
    }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(RpcError);
    expect((error as RpcError).code).toBe('UNDERAGE');
  });

  it('sceglie il proprio @tag con set_handle', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: 'luca_97', error: null });
    await expect(setHandle('luca_97')).resolves.toBe('luca_97');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('set_handle', { p_handle: 'luca_97' });
  });

  it('traduce gli errori di set_handle in codici tipizzati', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'HANDLE_TAKEN' } });
    const error = await setHandle('luca_97').catch((caught: unknown) => caught);
    expect((error as RpcError).code).toBe('HANDLE_TAKEN');
  });

  it('controlla la disponibilità di un @tag', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: 'taken', error: null });
    await expect(checkHandleAvailability('luca_97')).resolves.toBe('taken');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('is_handle_available', { p_handle: 'luca_97' });
  });

  it('rifiuta uno stato di disponibilità sconosciuto', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: 'boh', error: null });
    await expect(checkHandleAvailability('luca_97')).rejects.toThrow();
  });

  it('cambia handle, lingua e cancella l’account via RPC', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: 'volpe.oro', error: null });
    await expect(regenerateHandle()).resolves.toBe('volpe.oro');
    await setLocale('en');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('set_locale', { p_locale: 'en' });
    // Auth emails (reset password) read the language from user metadata
    expect(fakeSupabase.auth.updateUser).toHaveBeenCalledWith({ data: { locale: 'en' } });
    await deleteMyAccount();
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('delete_my_account', undefined);
  });
});
