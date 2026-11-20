import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Sheet } from '@/components/ui/Sheet';
import { Toast } from '@/components/ui/Toast';
import { spacing } from '@/theme/tokens';

import { FeedbackForm } from './FeedbackForm';
import { useFeedback } from './store/feedbackStore';

const THANKS_MS = 3000;

// One host for the whole app (root navigator): the TopBar icon only fills the store, so every tab
// shares the same sheet and the screenshot is taken before it exists.
export function FeedbackHost() {
  return (
    <>
      <FeedbackSheet />
      <ThanksToast />
    </>
  );
}

function FeedbackSheet() {
  const draft = useFeedback((state) => state.draft);
  const close = useFeedback((state) => state.close);
  return (
    <Sheet visible={draft !== null} onClose={close}>
      {draft ? <FeedbackForm draft={draft} /> : null}
    </Sheet>
  );
}

function ThanksToast() {
  const { t } = useTranslation('feedback');
  const insets = useSafeAreaInsets();
  const thanked = useFeedback((state) => state.thanked);
  const setThanked = useFeedback((state) => state.setThanked);
  useEffect(() => {
    if (!thanked) return;
    const timer = setTimeout(() => setThanked(false), THANKS_MS);
    return () => clearTimeout(timer);
  }, [thanked, setThanked]);
  if (!thanked) return null;
  return (
    <View pointerEvents="none" style={[styles.toast, { bottom: insets.bottom + spacing.xxl }]}>
      <Toast tone="success" message={t('thanks')} />
    </View>
  );
}

const styles = StyleSheet.create({
  toast: { position: 'absolute', left: spacing.xl, right: spacing.xl },
});
