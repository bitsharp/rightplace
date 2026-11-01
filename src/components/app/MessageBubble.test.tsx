import { render, screen } from '@testing-library/react-native';

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
