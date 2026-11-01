export type TurnstileMessage =
  { type: 'token'; token: string } | { type: 'expired' } | { type: 'error' };

type HtmlOptions = { siteKey: string; language: 'it' | 'en' };

export function buildTurnstileHtml({ siteKey, language }: HtmlOptions): string {
  // The key is interpolated into a script: allow only the characters Cloudflare uses.
  if (!/^[0-9A-Za-z_-]+$/.test(siteKey)) throw new Error('Invalid Turnstile site key');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad" async defer></script>
<style>html,body{margin:0;background:transparent;display:flex;justify-content:center;align-items:center}</style>
</head><body><div id="widget"></div><script>
function post(message){window.ReactNativeWebView.postMessage(JSON.stringify(message));}
function onTurnstileLoad(){turnstile.render('#widget',{sitekey: '${siteKey}', language: '${language}', theme: 'dark',
callback:function(token){post({type:'token',token:token});},
'expired-callback':function(){post({type:'expired'});},
'error-callback':function(){post({type:'error'});}});}
</script></body></html>`;
}

export function parseTurnstileMessage(data: string): TurnstileMessage | null {
  try {
    const message: unknown = JSON.parse(data);
    if (typeof message !== 'object' || message === null) return null;
    const { type, token } = message as { type?: unknown; token?: unknown };
    if (type === 'token')
      return typeof token === 'string' && token.length > 0 ? { type, token } : null;
    return type === 'expired' || type === 'error' ? { type } : null;
  } catch {
    // Messages from the WebView are untrusted: anything that is not our JSON is ignored.
    return null;
  }
}

const ALLOWED_ORIGINS = ['https://challenges.cloudflare.com', 'https://rightplace.app'];

// The captcha WebView must never become a browser: only the widget and our blank base page load.
export function isTurnstileNavigationAllowed(url: string): boolean {
  if (url === 'about:blank') return true;
  try {
    return ALLOWED_ORIGINS.includes(new URL(url).origin);
  } catch {
    // unparsable URLs are refused
    return false;
  }
}
