import { Tabs } from 'expo-router/js-tabs';
import { useTranslation } from 'react-i18next';

import { TAB_NAMES, TabIcon } from '@/components/app/TabIcon';
import { colors, fonts, layout } from '@/theme/tokens';

export default function TabsLayout() {
  const { t } = useTranslation('common');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          height: layout.tabBarHeight,
          backgroundColor: colors.background,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontFamily: fonts.bodyMedium, fontSize: 11 },
      }}
    >
      {TAB_NAMES.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(`tabs.${name}`),
            tabBarIcon: ({ color }) => <TabIcon name={name} color={color} />,
          }}
        />
      ))}
    </Tabs>
  );
}
