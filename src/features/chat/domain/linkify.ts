export type TextSegment =
  { kind: 'text'; text: string } | { kind: 'link'; text: string; url: string };

const CANDIDATE = /(?:https?:\/\/|www\.)[^\s<>]+/gi;
// A link starts a word: after "@" it is a handle or an e-mail, after ":" it may hide another scheme.
const BEFORE_LINK = /^(?:|[\s([{"'])$/;
const TRAILING_PUNCTUATION = /[.,;:!?'"]$/;
const CLOSERS: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
const HOST = /^[a-z0-9][a-z0-9.-]*(?::\d+)?$/i;
const HTTP_URL = /^https?:\/\/\S+$/i;

// Only http(s) is ever opened: tel:, intent:, javascript: and the like never become a link or reach Linking.
export function isOpenableUrl(url: string): boolean {
  return HTTP_URL.test(url);
}

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}

// Sentence punctuation is not part of the address; a closing bracket is, only when it is balanced.
function trimTrailing(candidate: string): string {
  let url = candidate;
  for (;;) {
    const last = url.slice(-1);
    const opener = CLOSERS[last];
    const strip =
      TRAILING_PUNCTUATION.test(url) ||
      (opener !== undefined && count(url, last) > count(url, opener));
    if (!strip) return url;
    url = url.slice(0, -1);
  }
}

function hasValidHost(url: string): boolean {
  const authority = url.replace(/^(?:https?:\/\/)?/i, '').split(/[/?#]/)[0] ?? '';
  return HOST.test(authority);
}

function normalize(url: string): string {
  return /^www\./i.test(url) ? `https://${url}` : url;
}

export function linkify(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(CANDIDATE)) {
    const start = match.index ?? 0;
    const shown = trimTrailing(match[0]);
    if (!BEFORE_LINK.test(text.charAt(start - 1)) || !hasValidHost(shown)) continue;
    if (start > cursor) segments.push({ kind: 'text', text: text.slice(cursor, start) });
    segments.push({ kind: 'link', text: shown, url: normalize(shown) });
    cursor = start + shown.length;
  }
  if (cursor < text.length) segments.push({ kind: 'text', text: text.slice(cursor) });
  return segments;
}
