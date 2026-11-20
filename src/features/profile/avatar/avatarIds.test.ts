import { MAX_AVATAR_IDS, normalizeAvatarIds } from './avatarIds';

describe('normalizeAvatarIds', () => {
  it('toglie vuoti e doppioni e ordina, così lo stesso gruppo ha sempre la stessa chiave', () => {
    expect(normalizeAvatarIds(['b', '', 'a', 'b', undefined, null])).toEqual(['a', 'b']);
  });

  it('non supera il massimo accettato dal server (100)', () => {
    const many = Array.from({ length: 150 }, (_, i) => `u${String(i).padStart(3, '0')}`);
    expect(MAX_AVATAR_IDS).toBe(100);
    expect(normalizeAvatarIds(many)).toHaveLength(100);
  });

  it('una lista vuota resta vuota', () => {
    expect(normalizeAvatarIds([])).toEqual([]);
  });
});
