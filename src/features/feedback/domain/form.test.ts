import { MAX_COMMENT_LENGTH, canSubmitFeedback, remainingCharacters } from './form';

describe('canSubmitFeedback', () => {
  it('richiede le stelle', () => {
    expect(canSubmitFeedback({ rating: 0, comment: 'ok' })).toBe(false);
    expect(canSubmitFeedback({ rating: 3, comment: '' })).toBe(true);
  });

  it('rifiuta un voto fuori da 1–5', () => {
    expect(canSubmitFeedback({ rating: 6, comment: '' })).toBe(false);
    expect(canSubmitFeedback({ rating: 2.5, comment: '' })).toBe(false);
  });

  it('rifiuta un commento oltre il massimo, contando solo il testo ripulito', () => {
    const atLimit = 'x'.repeat(MAX_COMMENT_LENGTH);
    expect(canSubmitFeedback({ rating: 5, comment: atLimit })).toBe(true);
    expect(canSubmitFeedback({ rating: 5, comment: `${atLimit}x` })).toBe(false);
    expect(canSubmitFeedback({ rating: 5, comment: `  ${atLimit}  ` })).toBe(true);
  });
});

describe('remainingCharacters', () => {
  it('conta i caratteri che restano', () => {
    expect(remainingCharacters('abc')).toBe(MAX_COMMENT_LENGTH - 3);
  });
});
