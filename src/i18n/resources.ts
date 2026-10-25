import enAuth from './en/auth.json';
import enChat from './en/chat.json';
import enCommon from './en/common.json';
import enCreator from './en/creator.json';
import enFeed from './en/feed.json';
import enFriends from './en/friends.json';
import enMap from './en/map.json';
import enProfile from './en/profile.json';
import enVenue from './en/venue.json';
import itAuth from './it/auth.json';
import itChat from './it/chat.json';
import itCommon from './it/common.json';
import itCreator from './it/creator.json';
import itFeed from './it/feed.json';
import itFriends from './it/friends.json';
import itMap from './it/map.json';
import itProfile from './it/profile.json';
import itVenue from './it/venue.json';

export const resources = {
  it: {
    common: itCommon,
    auth: itAuth,
    map: itMap,
    friends: itFriends,
    chat: itChat,
    feed: itFeed,
    profile: itProfile,
    venue: itVenue,
    creator: itCreator,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    map: enMap,
    friends: enFriends,
    chat: enChat,
    feed: enFeed,
    profile: enProfile,
    venue: enVenue,
    creator: enCreator,
  },
} as const;

export const DEFAULT_NAMESPACE = 'common';
export const NAMESPACES = Object.keys(resources.it) as (keyof typeof resources.it)[];
