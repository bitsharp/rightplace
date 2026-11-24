import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Toast } from '@/components/ui/Toast';
import { avatarIntent } from '@/features/friends/domain/avatarColor';
import { colors, heights } from '@/theme/tokens';

import type { AvatarEditorState } from '../avatar/useAvatarEditor';
import { formatHandle } from '../domain/handle';
import { AvatarSheet } from './AvatarSheet';
import { EnlargeablePhoto } from './EnlargeablePhoto';

type Props = { handle: string; editor: AvatarEditorState; size?: number };

// The avatar of my own profile: a tap enlarges the photo, the pencil badge (or a long press) opens the sheet to change or remove it (visible only to me and to my
// accepted followers). Without a photo it shows the initial, as everywhere else. The state comes from the parent
// (useAvatarEditor) so the notices can be drawn where there is room for them (AvatarEditorNotice).
export function AvatarEditor({ handle, editor, size = 86 }: Props) {
  const { t } = useTranslation('profile');
  const { photoFlow } = editor;
  const photo =
    editor.photoUri && editor.userId
      ? { uri: editor.photoUri, cacheKey: editor.userId }
      : undefined;
  return (
    <View>
      <EnlargeablePhoto
        photo={photo}
        size={size}
        disabled={editor.busy}
        onLongPress={photoFlow.openSheet}
      >
        <Avatar
          intent={avatarIntent(handle)}
          initial={formatHandle(handle).charAt(1)}
          size={size}
          photo={photo}
        />
      </EnlargeablePhoto>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('avatar.change')}
        disabled={editor.busy}
        onPress={photoFlow.openSheet}
        hitSlop={(heights.minTapTarget - BADGE) / 2}
        style={styles.badge}
      >
        {editor.busy ? (
          <ActivityIndicator size="small" color={colors.onAccent} />
        ) : (
          <Icon name="pencil" size={14} color="onAccent" />
        )}
      </Pressable>
      <AvatarSheet
        visible={photoFlow.sheetOpen}
        hasPhoto={photo !== undefined}
        onPick={photoFlow.choose}
        onRemove={editor.removePhoto}
        onClose={photoFlow.closeSheet}
        onDismiss={photoFlow.onSheetDismiss}
      />
    </View>
  );
}

export function AvatarEditorNotice({ editor }: { editor: AvatarEditorState }) {
  const { t } = useTranslation('profile');
  const { t: tUi } = useTranslation('ui');
  const { notice } = editor.photoFlow;
  if (notice) return <Toast tone="info" message={tUi(`photoSource.${notice}`)} />;
  if (editor.errorCode) return <Toast tone="info" message={t(`errors:rpc.${editor.errorCode}`)} />;
  return null;
}

const BADGE = heights.minTapTarget / 2;
const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: BADGE,
    height: BADGE,
    borderRadius: BADGE / 2,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
