// Events carry no properties by design: no age band, gender, location or ids ever leave the device
// for analytics (prompt 05 §8, CLAUDE.md principle 9). The provider is plugged in later.
export type AnalyticsEvent = 'signup_started' | 'signup_completed' | 'profile_completed';

type Sink = (event: AnalyticsEvent) => void;

let sink: Sink | null = null;

export function setAnalyticsSink(next: Sink | null): void {
  sink = next;
}

export function track(event: AnalyticsEvent): void {
  sink?.(event);
}
