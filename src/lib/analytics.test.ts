import { setAnalyticsSink, track } from './analytics';

describe('analytics', () => {
  it('invia solo il nome dell’evento, mai proprietà personali', () => {
    const sink = jest.fn();
    setAnalyticsSink(sink);
    track('profile_completed');
    expect(sink).toHaveBeenCalledWith('profile_completed');
    expect(sink.mock.calls[0]).toHaveLength(1);
  });

  it('non fa nulla senza un sink configurato', () => {
    setAnalyticsSink(null);
    expect(() => track('signup_started')).not.toThrow();
  });
});
