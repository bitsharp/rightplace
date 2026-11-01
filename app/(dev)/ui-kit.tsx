import { Redirect } from 'expo-router';

import { UiKitScreen } from '@/features/dev/ui-kit/UiKitScreen';

export default function UiKitRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <UiKitScreen />;
}
