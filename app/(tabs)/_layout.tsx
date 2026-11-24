import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';

import { isTabName, TAB_NAMES, TabBar } from '@/components/app/TabBar';
import { useFollowRequestsCount } from '@/features/friends/hooks';
import { useDmUnreadCount } from '@/features/dm/hooks';
import { useUnreadChatCount } from '@/features/notifications/hooks';

function RouterTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const current = state.routes[state.index]?.name ?? 'map';
  const select = (name: string) => {
    const route = state.routes.find((candidate) => candidate.name === name);
    if (route) navigateToTab(route.key);
  };
  const requests = useFollowRequestsCount();
  const unreadChats = useUnreadChatCount() + useDmUnreadCount();
  return (
    <TabBar
      active={isTabName(current) ? current : 'map'}
      onSelect={select}
      badges={{ friends: requests.data ?? 0, chat: unreadChats }}
    />
  );
}

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <RouterTabBar {...props} />}>
      {TAB_NAMES.map((name) => (
        <Tabs.Screen key={name} name={name} />
      ))}
    </Tabs>
  );
}
