import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { ProfileHeader } from './ProfileHeader';

const base = {
  handle: 'volpe.viola',
  meta: '25–34 · Donna',
  avatar: <Text>avatar</Text>,
};

describe('ProfileHeader', () => {
  it('mostra @handle, fascia d’età · genere, avatar e azioni', async () => {
    await render(
      <ProfileHeader {...base} counters={{ posts: 3, followers: 12, following: 30 }}>
        <Text>azioni</Text>
      </ProfileHeader>,
    );
    expect(screen.getByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText('25–34 · Donna')).toBeOnTheScreen();
    expect(screen.getByText('avatar')).toBeOnTheScreen();
    expect(screen.getByText('azioni')).toBeOnTheScreen();
  });

  it('mostra i tre contatori: post, follower, seguiti', async () => {
    await render(<ProfileHeader {...base} counters={{ posts: 3, followers: 12, following: 30 }} />);
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.getByText('30')).toBeOnTheScreen();
    expect(screen.getByText('profile:header.posts')).toBeOnTheScreen();
    expect(screen.getByText('profile:header.followers')).toBeOnTheScreen();
    expect(screen.getByText('profile:header.following')).toBeOnTheScreen();
  });

  it('toccare follower o seguiti apre le liste', async () => {
    const onOpenFollowers = jest.fn();
    const onOpenFollowing = jest.fn();
    await render(
      <ProfileHeader
        {...base}
        counters={{ posts: 3, followers: 12, following: 30 }}
        onOpenFollowers={onOpenFollowers}
        onOpenFollowing={onOpenFollowing}
      />,
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'profile:header.a11yFollowers({"count":12})' }),
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'profile:header.a11yFollowing({"count":30})' }),
    );
    expect(onOpenFollowers).toHaveBeenCalledTimes(1);
    expect(onOpenFollowing).toHaveBeenCalledTimes(1);
  });

  it('un contatore nascosto (null) mostra un trattino e non è toccabile', async () => {
    await render(
      <ProfileHeader
        {...base}
        counters={{ posts: null, followers: null, following: null }}
        onOpenFollowers={jest.fn()}
        onOpenFollowing={jest.fn()}
      />,
    );
    expect(screen.getAllByText('–')).toHaveLength(3);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('senza i gestori le liste non sono toccabili (profilo altrui)', async () => {
    await render(<ProfileHeader {...base} counters={{ posts: 1, followers: 2, following: 3 }} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ProfileHeader centrato (il mio profilo)', () => {
  const counters = { posts: 3, followers: 12, following: 30 };

  it('mette la foto sopra, centrata, e i contatori sotto l’identità', async () => {
    await render(<ProfileHeader {...base} counters={counters} layout="centered" />);
    expect(screen.getByTestId('profile-header-top')).toHaveStyle({
      flexDirection: 'column',
      alignItems: 'center',
    });
    expect(screen.getByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
  });

  it('di default resta a riga: foto e contatori affiancati', async () => {
    await render(<ProfileHeader {...base} counters={counters} />);
    expect(screen.getByTestId('profile-header-top')).toHaveStyle({ flexDirection: 'row' });
  });

  it('mostra la città con l’icona del pin dopo fascia d’età · genere', async () => {
    await render(<ProfileHeader {...base} counters={counters} layout="centered" city="Milano" />);
    expect(screen.getByText('Milano')).toBeOnTheScreen();
    expect(screen.getByTestId('icon-map', { includeHiddenElements: true })).toBeTruthy();
  });

  it('senza città non c’è il pin', async () => {
    await render(<ProfileHeader {...base} counters={counters} layout="centered" />);
    expect(screen.queryByTestId('icon-map', { includeHiddenElements: true })).toBeNull();
  });
});
