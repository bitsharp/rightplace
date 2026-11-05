import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, View } from 'react-native';

import { PhotoFrame } from '@/components/app/PhotoFrame';
import { PhotoSourceSheet } from '@/components/app/PhotoSourceSheet';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { Toast } from '@/components/ui/Toast';
import { colors, heights, radius, spacing } from '@/theme/tokens';

import { MAX_CAPTION_LENGTH } from '../domain/caption';
import { useNewPost } from '../useNewPost';

type State = ReturnType<typeof useNewPost>;

export function NewPostScreen() {
  const { t } = useTranslation('post');
  const post = useNewPost();
  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fill}
      >
        <View style={styles.top}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('close')}
            onPress={post.close}
            style={styles.close}
          >
            <Icon name="close" />
          </Pressable>
        </View>
        <MonoLabel tone="going" size="large">
          {t('label')}
        </MonoLabel>
        <Text accessibilityRole="header" variant="display24">
          {t('title')}
        </Text>
        <Body post={post} />
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Body({ post }: { post: State }) {
  const { t } = useTranslation('post');
  if (post.targetFailed) return <Text color="error">{t('loadError')}</Text>;
  if (!post.targetLoaded) return null;
  if (post.target === null) return <NoTarget onBack={post.goToMap} />;
  return <Form post={post} venue={post.target.venueName} />;
}

function NoTarget({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation('post');
  return (
    <View style={styles.form}>
      <Text variant="body16Strong">{t('noTarget.title')}</Text>
      <Text color="textSecondary">{t('noTarget.body')}</Text>
      <Button label={t('noTarget.cta')} variant="ghost" onPress={onBack} />
    </View>
  );
}

function Form({ post, venue }: { post: State; venue: string }) {
  const { t } = useTranslation('post');
  return (
    <View style={styles.form}>
      <View style={styles.prompt}>
        <Icon name="bell" size={26} color="going" />
        <View style={styles.promptTexts}>
          <Text variant="body15Strong">{t('prompt.title')}</Text>
          <Text variant="body13" color="textSecondary">
            {t('venue', { venue })}
          </Text>
        </View>
      </View>
      <PhotoArea post={post} />
      <TextField
        label={t('caption.label')}
        placeholder={t('caption.placeholder')}
        value={post.caption}
        onChangeText={post.setCaption}
        maxLength={MAX_CAPTION_LENGTH}
        multiline
      />
      <Text variant="body12" color="textSecondary">
        {t('caption.counter', { count: post.caption.length, max: MAX_CAPTION_LENGTH })}
      </Text>
      <Text variant="body13" color="textSecondary">
        {t('note')}
      </Text>
      <PublishFooter post={post} />
    </View>
  );
}

function PublishFooter({ post }: { post: State }) {
  const { t } = useTranslation('post');
  const { t: tErrors } = useTranslation('errors');
  const { t: tUi } = useTranslation('ui');
  return (
    <>
      {post.errorCode ? (
        <Text variant="body13" color="error">
          {tErrors(`rpc.${post.errorCode}`)}
        </Text>
      ) : null}
      {post.photoFlow.notice ? (
        <Toast tone="info" message={tUi(`photoSource.${post.photoFlow.notice}`)} />
      ) : null}
      <Button
        label={t('publish')}
        loading={post.isPublishing}
        disabled={!post.canPublish}
        feedback="confirm"
        onPress={post.publish}
      />
      <PhotoSourceSheet
        visible={post.photoFlow.sheetOpen}
        onPick={post.photoFlow.choose}
        onClose={post.photoFlow.closeSheet}
        onDismiss={post.photoFlow.onSheetDismiss}
      />
    </>
  );
}

function PhotoArea({ post }: { post: State }) {
  const { t } = useTranslation('post');
  if (post.photoUri) {
    return (
      <View style={styles.photoBox}>
        <PhotoFrame height={200} uri={post.photoUri} accessibilityLabel={t('photo.preview')} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('photo.remove')}
          onPress={post.removePhoto}
          style={styles.removePhoto}
        >
          <Icon name="close" size={18} />
        </Pressable>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('photo.add')}
      onPress={post.photoFlow.openSheet}
      style={styles.addPhoto}
    >
      <Icon name="camera" size={30} color="textSecondary" />
      <MonoLabel size="medium">{t('photo.add')}</MonoLabel>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, gap: spacing.md },
  top: { flexDirection: 'row' },
  close: {
    width: heights.buttonMedium,
    height: heights.buttonMedium,
    borderRadius: heights.buttonMedium / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: { gap: spacing.md },
  prompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md + 2,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.goingBorder,
    backgroundColor: colors.surface,
  },
  promptTexts: { flex: 1, gap: 3 },
  addPhoto: {
    height: 200,
    borderRadius: radius.cardLarge,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  photoBox: { borderRadius: radius.cardLarge, overflow: 'hidden' },
  removePhoto: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    borderRadius: heights.minTapTarget / 2,
    backgroundColor: colors.backdrop,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
