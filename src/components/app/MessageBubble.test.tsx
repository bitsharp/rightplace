import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking, StyleSheet } from 'react-native';

import { useLinkActions } from '@/lib/links/linkActionsStore';

import { colors } from '@/theme/tokens';

import { MessageBubble } from './MessageBubble';
import { PhotoFrame } from './PhotoFrame';

describe('MessageBubble', () => {
  it('mostra i miei messaggi a destra, in viola, senza nome', async () => {
    await render(<MessageBubble author="me" content={{ kind: 'text', text: 'ciao' }} />);
    expect(screen.getByTestId('bubble-wrap')).toHaveStyle({ alignSelf: 'flex-end' });
    expect(screen.getByTestId('bubble')).toHaveStyle({ backgroundColor: colors.going });
  });

  it('mostra i messaggi altrui a sinistra con il nome del mittente', async () => {
    await render(
      <MessageBubble
        author="other"
        senderName="@volpe.viola"
        content={{ kind: 'text', text: 'ci sono' }}
      />,
    );
    expect(screen.getByTestId('bubble-wrap')).toHaveStyle({ alignSelf: 'flex-start' });
    expect(screen.getByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByTestId('bubble')).toHaveStyle({ backgroundColor: colors.surface });
  });

  it('per le mie foto ricorda che le vedono solo i follower', async () => {
    await render(<MessageBubble author="me" content={{ kind: 'photo', caption: 'che serata' }} />);
    expect(screen.getByText('che serata')).toBeOnTheScreen();
    expect(screen.getByText('ui:chat.followersOnly')).toBeOnTheScreen();
  });
});

describe('MessageBubble: stati e azioni', () => {
  it('mentre sta partendo mostra "invio" e non è toccabile per riprovare', async () => {
    const onRetry = jest.fn();
    await render(
      <MessageBubble
        author="me"
        status="sending"
        onRetry={onRetry}
        content={{ kind: 'text', text: 'ciao' }}
      />,
    );
    expect(screen.getByText('ui:chat.sending')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('ciao'));
    expect(onRetry).not.toHaveBeenCalled();
  });

  it('se non è partito lo dice e un tocco lo rimanda', async () => {
    const onRetry = jest.fn();
    await render(
      <MessageBubble
        author="me"
        status="failed"
        onRetry={onRetry}
        content={{ kind: 'text', text: 'ciao' }}
      />,
    );
    expect(screen.getByText('ui:chat.failed')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('ciao'));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('il tocco lungo apre le azioni (segnala, blocca)', async () => {
    const onLongPress = jest.fn();
    await render(
      <MessageBubble
        author="other"
        senderName="@volpe.viola"
        onLongPress={onLongPress}
        content={{ kind: 'text', text: 'ciao' }}
      />,
    );
    await fireEvent(screen.getByText('ciao'), 'longPress');
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });
});

describe('PhotoFrame', () => {
  it('senza immagine mostra un segnaposto sfumato', async () => {
    await render(<PhotoFrame height={150} />);
    expect(
      screen.getByTestId('photo-placeholder', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('con un’immagine la mostra', async () => {
    await render(
      <PhotoFrame height={150} uri="https://example.com/a.jpg" accessibilityLabel="feed:photo" />,
    );
    expect(screen.getByLabelText('feed:photo')).toBeOnTheScreen();
  });
});

describe('MessageBubble: link', () => {
  beforeEach(() => {
    jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
  });

  it('un link nel messaggio altrui è toccabile e apre il browser', async () => {
    await render(
      <MessageBubble
        author="other"
        content={{ kind: 'text', text: 'biglietti su www.example.com/b' }}
      />,
    );
    await fireEvent.press(screen.getByRole('link'));
    expect(Linking.openURL).toHaveBeenCalledWith('https://www.example.com/b');
  });

  it('un link nel mio messaggio è leggibile sul viola (colore del testo sul viola)', async () => {
    await render(
      <MessageBubble author="me" content={{ kind: 'text', text: 'https://example.com' }} />,
    );
    expect(StyleSheet.flatten(screen.getByRole('link').props.style).color).toBe(colors.onAccent);
  });

  it('il tocco lungo sul link apre le azioni del link, non quelle del messaggio', async () => {
    const onLongPress = jest.fn();
    await render(
      <MessageBubble
        author="other"
        content={{ kind: 'text', text: 'https://example.com' }}
        onLongPress={onLongPress}
      />,
    );
    await fireEvent(screen.getByRole('link'), 'longPress');
    expect(useLinkActions.getState().sheetUrl).toBe('https://example.com');
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it('il tocco lungo sul resto del messaggio apre le azioni del messaggio', async () => {
    const onLongPress = jest.fn();
    await render(
      <MessageBubble
        author="other"
        content={{ kind: 'text', text: 'ciao https://example.com' }}
        onLongPress={onLongPress}
      />,
    );
    await fireEvent(screen.getByText(/ciao/), 'longPress');
    expect(onLongPress).toHaveBeenCalled();
  });
});
