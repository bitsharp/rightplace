import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { EventRow } from '@/components/app/EventRow';
import { FriendRow } from '@/components/app/FriendRow';
import { MessageBubble } from '@/components/app/MessageBubble';
import { PlanCard } from '@/components/app/PlanCard';
import { PostCard } from '@/components/app/PostCard';
import { TabBar, type TabName } from '@/components/app/TabBar';
import { TopBar } from '@/components/app/TopBar';
import { TransportRow } from '@/components/app/TransportRow';
import { Toggle } from '@/components/ui/Toggle';
import type { FollowStatus } from '@/features/friends/domain/followButton';

import { SAMPLE_FRIENDS, SAMPLE_HANDLE, SAMPLE_STORIES, SAMPLE_VENUE } from './samples';
import { Section } from './Section';

const noop = () => undefined;
const [FIRST = '', SECOND = ''] = SAMPLE_FRIENDS;
const NEXT_FOLLOW: Record<FollowStatus, FollowStatus> = {
  none: 'pending',
  pending: 'none',
  accepted: 'none',
};

export function SocialSection() {
  return (
    <Section name="social">
      <PeopleDemo />
      <ChatDemo />
      <PostDemo />
      <TransportDemo />
    </Section>
  );
}

function PeopleDemo() {
  const { t } = useTranslation('dev');
  const [follow, setFollow] = useState<FollowStatus>('none');
  return (
    <>
      <FriendRow
        handle={FIRST}
        meta={t('sample.friendMeta')}
        venueLine={SAMPLE_VENUE}
        followState="accepted"
        onAction={noop}
      />
      <FriendRow
        handle={SECOND}
        meta={t('sample.friendMeta')}
        followState={follow}
        onAction={() => setFollow(NEXT_FOLLOW[follow])}
      />
    </>
  );
}

function ChatDemo() {
  const { t } = useTranslation('dev');
  return (
    <>
      <MessageBubble
        author="other"
        senderName={`@${FIRST}`}
        content={{ kind: 'text', text: t('sample.textOther') }}
      />
      <MessageBubble author="me" content={{ kind: 'text', text: t('sample.textMine') }} />
      <MessageBubble
        author="me"
        content={{ kind: 'photo', caption: t('sample.caption'), scene: 1 }}
      />
    </>
  );
}

function PostDemo() {
  const { t } = useTranslation('dev');
  const [liked, setLiked] = useState(false);
  return (
    <PostCard
      handle={FIRST}
      meta={SAMPLE_VENUE}
      tone="going"
      daysLeft={6}
      caption={t('sample.caption')}
      likeCount={liked ? 13 : 12}
      liked={liked}
      commentCount={3}
      onToggleLike={() => setLiked(!liked)}
      onOpenComments={noop}
    />
  );
}

function TransportDemo() {
  const { t } = useTranslation('dev');
  return (
    <>
      <TransportRow
        badge="TAXI"
        name={t('sample.taxi')}
        detail={t('sample.taxiDetail')}
        action={t('sample.call')}
        onPress={noop}
      />
      <TransportRow
        badge="ATM"
        name={t('sample.publicTransport')}
        detail={t('sample.transitDetail')}
        action={t('sample.open')}
        onPress={noop}
      />
    </>
  );
}

export function CreatorSection() {
  const { t } = useTranslation('dev');
  const [selected, setSelected] = useState(true);
  const perks = [t('sample.perkSponsor'), t('sample.perkNotify')];
  return (
    <Section name="creator">
      <PlanCard
        name={t('sample.planName')}
        priceLabel={t('sample.planPrice')}
        perks={perks}
        status={selected ? 'selected' : 'available'}
        onPress={() => setSelected(!selected)}
      />
      <PlanCard name={t('sample.planName')} priceLabel={t('sample.planPrice')} status="active" />
      <PlanCard name={t('sample.planName')} priceLabel={t('sample.planPrice')} status="cancelled" />
      <EventRow
        name={t('sample.eventName')}
        meta={SAMPLE_VENUE}
        whenLabel={t('sample.eventWhen')}
        goingBand="30–50"
        maybeBand="10–20"
        targetLabel={t('sample.target')}
      />
    </Section>
  );
}

export function NavigationSection() {
  const { t } = useTranslation('dev');
  const [canPost, setCanPost] = useState(false);
  const [tab, setTab] = useState<TabName>('map');
  return (
    <Section name="navigation">
      <Toggle title={t('sample.canPost')} value={canPost} onValueChange={setCanPost} />
      <TopBar
        handle={SAMPLE_HANDLE}
        canPost={canPost}
        hasNews
        stories={SAMPLE_STORIES}
        onPost={noop}
        onOpenProfile={noop}
        onOpenNews={noop}
        onOpenStory={noop}
      />
      <TabBar active={tab} onSelect={setTab} />
    </Section>
  );
}
