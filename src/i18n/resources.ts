import enAuth from './en/auth.json';
import enChat from './en/chat.json';
import enCommon from './en/common.json';
import enCreator from './en/creator.json';
import enDev from './en/dev.json';
import enDm from './en/dm.json';
import enErrors from './en/errors.json';
import enEvent from './en/event.json';
import enFeed from './en/feed.json';
import enFeedback from './en/feedback.json';
import enFriends from './en/friends.json';
import enLegal from './en/legal.json';
import enMap from './en/map.json';
import enNotifications from './en/notifications.json';
import enPost from './en/post.json';
import enProfile from './en/profile.json';
import enSpots from './en/spots.json';
import enTour from './en/tour.json';
import enUi from './en/ui.json';
import enVenue from './en/venue.json';
import enVenues from './en/venues.json';
import itAuth from './it/auth.json';
import itChat from './it/chat.json';
import itCommon from './it/common.json';
import itCreator from './it/creator.json';
import itDev from './it/dev.json';
import itDm from './it/dm.json';
import itErrors from './it/errors.json';
import itEvent from './it/event.json';
import itFeed from './it/feed.json';
import itFeedback from './it/feedback.json';
import itFriends from './it/friends.json';
import itLegal from './it/legal.json';
import itMap from './it/map.json';
import itNotifications from './it/notifications.json';
import itPost from './it/post.json';
import itProfile from './it/profile.json';
import itSpots from './it/spots.json';
import itTour from './it/tour.json';
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
    dm: itDm,
    feed: itFeed,
    feedback: itFeedback,
    notifications: itNotifications,
    post: itPost,
    profile: itProfile,
    spots: itSpots,
    venue: itVenue,
    venues: itVenues,
    creator: itCreator,
    event: itEvent,
    tour: itTour,
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
    dm: enDm,
    feed: enFeed,
    feedback: enFeedback,
    notifications: enNotifications,
    post: enPost,
    profile: enProfile,
    spots: enSpots,
    venue: enVenue,
    venues: enVenues,
    creator: enCreator,
    event: enEvent,
    tour: enTour,
    ui: enUi,
    dev: enDev,
    errors: enErrors,
    legal: enLegal,
  },
} as const;

export const DEFAULT_NAMESPACE = 'common';
export const NAMESPACES = Object.keys(resources.it) as (keyof typeof resources.it)[];
