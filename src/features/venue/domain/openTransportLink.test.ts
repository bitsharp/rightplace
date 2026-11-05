import { Linking } from 'react-native';

import { openTransportLink } from './openTransportLink';

describe('openTransportLink', () => {
  afterEach(() => jest.restoreAllMocks());

  it('apre il link principale', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
    await expect(
      openTransportLink({ provider: 'taxi', primaryUrl: 'tel:+39028585' }),
    ).resolves.toBe(true);
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('tel:+39028585');
  });

  it('se l’app non c’è apre il sito di ripiego', async () => {
    const open = jest
      .spyOn(Linking, 'openURL')
      .mockRejectedValueOnce(new Error('no app'))
      .mockResolvedValueOnce(undefined);
    const link = {
      provider: 'freenow' as const,
      primaryUrl: 'freenow://',
      fallbackUrl: 'https://www.free-now.com/it/',
    };
    await expect(openTransportLink(link)).resolves.toBe(true);
    expect(open).toHaveBeenNthCalledWith(1, 'freenow://');
    expect(open).toHaveBeenNthCalledWith(2, 'https://www.free-now.com/it/');
  });

  it('senza ripiego e con il link che fallisce restituisce false, senza lanciare', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('no app'));
    await expect(openTransportLink({ provider: 'uber', primaryUrl: 'https://x' })).resolves.toBe(
      false,
    );
  });

  it('se falliscono sia il link sia il ripiego restituisce false', async () => {
    jest.spyOn(Linking, 'openURL').mockRejectedValue(new Error('nope'));
    await expect(
      openTransportLink({ provider: 'cabify', primaryUrl: 'cabify://', fallbackUrl: 'https://c' }),
    ).resolves.toBe(false);
  });
});
