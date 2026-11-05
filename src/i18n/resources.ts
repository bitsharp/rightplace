import enAuth from './en/auth.json';
import enChat from './en/chat.json';
import enCommon from './en/common.json';
import enCreator from './en/creator.json';
import enDev from './en/dev.json';
import enErrors from './en/errors.json';
import enFeed from './en/feed.json';
import enFriends from './en/friends.json';
import enLegal from './en/legal.json';
import enMap from './en/map.json';
import enPost from './en/post.json';
import enProfile from './en/profile.json';
import enUi from './en/ui.json';
import enVenue from './en/venue.json';
import enVenues from './en/venues.json';
import itAuth from './it/auth.json';
import itChat from './it/chat.json';
import itCommon from './it/common.json';
import itCreator from './it/creator.json';
import itDev from './it/dev.json';
import itErrors from './it/errors.json';
import itFeed from './it/feed.json';
import itFriends from './it/friends.json';
import itLegal from './it/legal.json';
import itMap from './it/map.json';
import itPost from './it/post.json';
import itProfile from './it/profile.json';
import itUi from './it/ui.json';
import itVenue from './it/venue.json';
import itVenues from './it/venues.json';

export const resources = {
  it: {
    common: itCommon,
    auth: itAuth,
    map: itMap,
    friends: itFriends,
    chat: itChat,
    feed: itFeed,
    post: itPost,
    profile: itProfile,
    venue: itVenue,
    venues: itVenues,
    creator: itCreator,
    ui: itUi,
    dev: itDev,
    errors: itErrors,
    legal: itLegal,
  },
  en: {
    common: enCommon,
    auth: enAuth,
    map: enMap,
    friends: enFriends,
    chat: enChat,
    feed: enFeed,
    post: enPost,
    profile: enProfile,
    venue: enVenue,
    venues: enVenues,
    creator: enCreator,
    ui: enUi,
    dev: enDev,
    errors: enErrors,
    legal: enLegal,
  },
} as const;

export const DEFAULT_NAMESPACE = 'common';
export const NAMESPACES = Object.keys(resources.it) as (keyof typeof resources.it)[];
