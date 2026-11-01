import { fireEvent, render, screen } from '@testing-library/react-native';

import { TurnstileBox } from './TurnstileBox';

const send = async (data: string) =>
  fireEvent(screen.getByTestId('turnstile-webview'), 'message', { nativeEvent: { data } });

describe('TurnstileBox', () => {
  it('carica il widget con la site key e la lingua', async () => {
    await render(
      <TurnstileBox siteKey="1x00000000000000000000AA" language="en" onToken={jest.fn()} />,
    );
    const source = screen.getByTestId('turnstile-webview').props.source as { html: string };
    expect(source.html).toContain("sitekey: '1x00000000000000000000AA'");
    expect(source.html).toContain("language: 'en'");
    expect(screen.getByText('auth:captcha.label')).toBeOnTheScreen();
  });

  it('propaga il token ricevuto dal widget', async () => {
    const onToken = jest.fn();
    await render(<TurnstileBox siteKey="key" language="it" onToken={onToken} />);
    await send('{"type":"token","token":"cf-123"}');
    expect(onToken).toHaveBeenLastCalledWith('cf-123');
    expect(screen.getByText('auth:captcha.verified')).toBeOnTheScreen();
  });

  it('azzera il token quando scade o va in errore', async () => {
    const onToken = jest.fn();
    await render(<TurnstileBox siteKey="key" language="it" onToken={onToken} />);
    await send('{"type":"token","token":"cf-123"}');
    await send('{"type":"expired"}');
    expect(onToken).toHaveBeenLastCalledWith(null);
    await send('{"type":"error"}');
    expect(screen.getByText('auth:captcha.error')).toBeOnTheScreen();
  });

  it('blocca la navigazione fuori dal widget', async () => {
    await render(<TurnstileBox siteKey="key" language="it" onToken={jest.fn()} />);
    const guard = screen.getByTestId('turnstile-webview').props
      .onShouldStartLoadWithRequest as (r: { url: string }) => boolean;
    expect(guard({ url: 'https://evil.example.com' })).toBe(false);
    expect(guard({ url: 'https://challenges.cloudflare.com/x' })).toBe(true);
  });

  it('ignora messaggi non riconosciuti', async () => {
    const onToken = jest.fn();
    await render(<TurnstileBox siteKey="key" language="it" onToken={onToken} />);
    await send('<script>');
    expect(onToken).not.toHaveBeenCalled();
  });
});
