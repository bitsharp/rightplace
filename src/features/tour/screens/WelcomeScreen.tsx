import { useLocalSearchParams, useRouter } from 'expo-router';

import { WelcomePages } from '../components/WelcomePages';
import { useTourStore } from '../store/tourStore';

// First visit (after onboarding, before the tabs) or "review" (profile -> How it works).
// Either way the welcome counts as seen once the user leaves it.
export function WelcomeScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const router = useRouter();
  const markWelcomeSeen = useTourStore((state) => state.markWelcomeSeen);
  const review = mode === 'review';
  const finish = () => {
    markWelcomeSeen();
    if (review) router.back();
    else router.replace('/map');
  };
  return <WelcomePages review={review} onFinish={finish} />;
}
