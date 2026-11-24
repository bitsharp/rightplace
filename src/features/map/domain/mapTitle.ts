// The title string is translated whole ("STASERA {{city}}") and cut at the city, which is drawn in violet.
// Languages that put the city first are not supported: the text after the city is dropped.
export function splitTitle(title: string, city: string): { lead: string; city: string } {
  const at = city === '' ? -1 : title.lastIndexOf(city);
  if (at < 0) return { lead: title.trim(), city: '' };
  return { lead: title.slice(0, at).trim(), city };
}
