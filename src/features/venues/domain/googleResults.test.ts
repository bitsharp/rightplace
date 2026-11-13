import type { GoogleSuggestion } from '../googleApi';

import { withoutCatalogDuplicates } from './googleResults';

const suggestion = (placeId: string): GoogleSuggestion => ({
  placeId,
  primaryText: `Luogo ${placeId}`,
  secondaryText: 'Milano',
  types: [],
});

describe('withoutCatalogDuplicates', () => {
  it('toglie i risultati Google già mostrati come righe del catalogo', () => {
    const rows = withoutCatalogDuplicates(
      [suggestion('A'), suggestion('B'), suggestion('C')],
      [{ googlePlaceId: 'B' }],
    );
    expect(rows.map((row) => row.placeId)).toEqual(['A', 'C']);
  });

  it('tiene tutto se il catalogo mostrato non ha lo stesso place_id', () => {
    expect(withoutCatalogDuplicates([suggestion('A')], [{ googlePlaceId: 'Z' }])).toHaveLength(1);
  });

  it('un risultato il cui locale è nel catalogo ma filtrato fuori dalla lista resta visibile', () => {
    expect(withoutCatalogDuplicates([suggestion('A')], [])).toHaveLength(1);
  });

  it('toglie anche i doppioni dentro la stessa risposta di Google', () => {
    expect(withoutCatalogDuplicates([suggestion('A'), suggestion('A')], [])).toHaveLength(1);
  });
});
