import { avatarPhotoFor } from './avatarPhoto';

describe('avatarPhotoFor', () => {
  it('con un URL restituisce la foto con l’id come chiave di cache', () => {
    expect(avatarPhotoFor({ u1: 'https://signed.test/u1' }, 'u1')).toEqual({
      uri: 'https://signed.test/u1',
      cacheKey: 'u1',
    });
  });

  it('senza URL (foto assente o non visibile) restituisce undefined: resta l’iniziale', () => {
    expect(avatarPhotoFor({ u1: 'https://signed.test/u1' }, 'u2')).toBeUndefined();
    expect(avatarPhotoFor({}, undefined)).toBeUndefined();
  });
});
