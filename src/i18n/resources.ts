import enAuth from './en/auth.json';
import enChat from './en/chat.json';
import enCommon from './en/common.json';
import enCreator from './en/creator.json';
import enDev from './en/dev.json';
import enFeed from './en/feed.json';
import enFriends from './en/friends.json';
import enMap from './en/map.json';
import enProfile from './en/profile.json';
import enUi from './en/ui.json';
import enVenue from './en/venue.json';
import itAuth from './it/auth.json';
import itChat from './it/chat.json';
import itCommon from './it/common.json';
import itCreator from './it/creator.json';
import itDev from './it/dev.json';
import itFeed from './it/feed.json';
import itFriends from './it/friends.json';
import itMap from './it/map.json';
import itProfile from './it/profile.json';
import itUi from './it/ui.json';
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
    ui: itUi,
    dev: itDev,
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
    ui: enUi,
    dev: enDev,
  },
} as const;

export const DEFAULT_NAMESPACE = 'common';
export const NAMESPACES = Object.keys(resources.it) as (keyof typeof resources.it)[];
