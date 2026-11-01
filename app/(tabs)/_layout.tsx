import { Tabs, type BottomTabBarProps } from 'expo-router/js-tabs';

import { isTabName, TAB_NAMES, TabBar } from '@/components/app/TabBar';

function RouterTabBar({ state, navigateToTab }: BottomTabBarProps) {
  const current = state.routes[state.index]?.name ?? 'map';
  const select = (name: string) => {
    const route = state.routes.find((candidate) => candidate.name === name);
    if (route) navigateToTab(route.key);
  };
  return <TabBar active={isTabName(current) ? current : 'map'} onSelect={select} />;
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
