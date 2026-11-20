import { useMutation } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { PhotoFrame } from '@/components/app/PhotoFrame';
import { Button } from '@/components/ui/Button';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { useSession } from '@/features/auth/useSession';
import { rpcErrorCodeOf } from '@/lib/rpcError';
import { colors, radius, spacing } from '@/theme/tokens';

import { MAX_COMMENT_LENGTH, canSubmitFeedback, remainingCharacters } from './domain/form';
import { sendFeedback } from './sendFeedback';
import { StarRating } from './StarRating';
import { useFeedback, type FeedbackDraft } from './store/feedbackStore';

const PREVIEW_HEIGHT = 140;

export function FeedbackForm({ draft }: { draft: FeedbackDraft }) {
  const { t, i18n } = useTranslation('feedback');
  const { userId } = useSession();
  const { close, removeScreenshot, setThanked } = useFeedback.getState();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const send = useMutation({
    mutationFn: () =>
      sendFeedback({
        userId: userId ?? '',
        rating,
        comment: comment.trim(),
        screen: draft.screen,
        screenshotUri: draft.screenshotUri,
        appVersion: Constants.expoConfig?.version ?? null,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        locale: i18n.language.startsWith('en') ? 'en' : 'it',
      }),
    onSuccess: () => {
      close();
      setThanked(true);
    },
  });
  const errorCode = rpcErrorCodeOf(send.error);

  return (
    <View style={styles.form}>
      <MonoLabel tone="going">{t('label')}</MonoLabel>
      <Text accessibilityRole="header" variant="display17" numberOfLines={2}>
        {t('title')}
      </Text>
      <Text variant="body13" color="textSecondary">
        {t('intro')}
      </Text>
      {draft.screenshotUri ? (
        <Screenshot uri={draft.screenshotUri} onRemove={removeScreenshot} />
      ) : null}
      <Text variant="body13Medium" color="textSecondary">
        {t('ratingLabel')}
      </Text>
      <StarRating value={rating} onChange={setRating} />
      <TextField
        label={t('commentLabel')}
        placeholder={t('commentPlaceholder')}
        value={comment}
        onChangeText={setComment}
        multiline
        maxLength={MAX_COMMENT_LENGTH}
      />
      <Text variant="body12" color="textSecondary">
        {t('counter', { count: remainingCharacters(comment) })}
      </Text>
      {draft.screenshotUri ? (
        <Text variant="body12" color="textSecondary">
          {t('privacyNote')}
        </Text>
      ) : null}
      {errorCode ? (
        <Text variant="body13" color="error">
          {t(`errors:rpc.${errorCode}`)}
        </Text>
      ) : null}
      <Button
        label={t('send')}
        feedback="confirm"
        loading={send.isPending}
        disabled={!canSubmitFeedback({ rating, comment })}
        onPress={() => send.mutate()}
      />
      <Button label={t('cancel')} variant="ghost" onPress={close} />
    </View>
  );
}

function Screenshot({ uri, onRemove }: { uri: string; onRemove: () => void }) {
  const { t } = useTranslation('feedback');
  return (
    <View style={styles.preview}>
      <View style={styles.thumb}>
        <PhotoFrame
          height={PREVIEW_HEIGHT}
          uri={uri}
          contentFit="contain"
          accessibilityLabel={t('screenshotA11y')}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('removeScreenshot')}
        onPress={onRemove}
        style={styles.remove}
      >
        <Text variant="body13Medium" color="going">
          {t('removeScreenshot')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.md },
  preview: { gap: spacing.sm, alignItems: 'center' },
  thumb: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  remove: { minHeight: 44, justifyContent: 'center' },
});
