import { renderHook } from '@testing-library/react-native';

import { useTargetLabel, useWhenLabel } from './useEventLabels';

describe('useTargetLabel', () => {
  it('senza filtri scrive "tutte le età · tutti"', async () => {
    const { result } = await renderHook(() => useTargetLabel());
    expect(result.current([], [])).toBe('ui:target.allAges · ui:target.gender.all');
  });

  it('elenca le fasce scelte e il genere', async () => {
    const { result } = await renderHook(() => useTargetLabel());
    expect(result.current(['18-24', '25-34'], ['female'])).toBe(
      'ui:target.age.18-24, ui:target.age.25-34 · ui:target.gender.female',
    );
  });

  it('"35+" vale per le due fasce del database', async () => {
    const { result } = await renderHook(() => useTargetLabel());
    expect(result.current(['35-44', '45+'], [])).toBe('ui:target.age.35+ · ui:target.gender.all');
  });
});

describe('useWhenLabel', () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date('2026-11-06T14:00:00Z')));
  afterEach(() => jest.useRealTimers());

  it('stasera con orario di inizio e fine nel fuso della città', async () => {
    const { result } = await renderHook(() => useWhenLabel());
    expect(result.current('2026-11-06T21:00:00Z', '2026-11-07T03:00:00Z', 'Europe/Rome')).toBe(
      'ui:eventWhen.tonight({"time":"22:00","endTime":"04:00"})',
    );
  });

  it('più avanti scrive la data', async () => {
    const { result } = await renderHook(() => useWhenLabel());
    const label = result.current('2026-11-14T21:00:00Z', '2026-11-15T03:00:00Z', 'Europe/Rome');
    expect(label).toContain('ui:eventWhen.date(');
    expect(label).toContain('"time":"22:00"');
  });
});
