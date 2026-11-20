const WEB_URL = /^https?:\/\/(?:[^/?#@]*@)?([^/?#:]+)/i;

// What the user sees of a website: the host (www. included), never the path, query, port or credentials.
// Null for anything that is not an http(s) address: the app only ever opens web links.
export function websiteDomain(url: string): string | null {
  const host = WEB_URL.exec(url)?.[1];
  return host ? host : null;
}
