import { fireEvent, render, screen } from '@testing-library/react-native';

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
