// The weekday in the city's time zone and the user's language ("venerdì" / "Friday"), through Intl.
export function weekdayName(now: Date, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone }).format(now);
}
