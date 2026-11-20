import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { Toast } from '@/components/ui/Toast';
import { avatarIntent } from '@/features/friends/domain/avatarColor';
import { colors, heights } from '@/theme/tokens';

import { useAvatarEditor } from '../avatar/useAvatarEditor';
import { formatHandle } from '../domain/handle';
import { AvatarSheet } from './AvatarSheet';

type Props = { handle: string; size?: number };

// The avatar of my own profile: a tap opens the sheet to change or remove the photo (visible only to me and to my
// accepted followers). Without a photo it shows the initial, as everywhere else.
export function AvatarEditor({ handle, size = 86 }: Props) {
  const { t } = useTranslation('profile');
  const { t: tUi } = useTranslation('ui');
  const editor = useAvatarEditor();
  const { photoFlow } = editor;
  const photo =
    editor.photoUri && editor.userId
      ? { uri: editor.photoUri, cacheKey: editor.userId }
      : undefined;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('avatar.change')}
        disabled={editor.busy}
        onPress={photoFlow.openSheet}
        style={{ width: size, height: size }}
      >
        <Avatar
          intent={avatarIntent(handle)}
          initial={formatHandle(handle).charAt(1)}
          size={size}
          photo={photo}
        />
        <View style={styles.badge}>
          {editor.busy ? (
            <ActivityIndicator size="small" color={colors.onAccent} />
          ) : (
            <Icon name="camera" size={14} color="onAccent" />
          )}
        </View>
      </Pressable>
      {photoFlow.notice ? (
        <Toast tone="info" message={tUi(`photoSource.${photoFlow.notice}`)} />
      ) : null}
      {editor.errorCode ? (
        <Toast tone="info" message={t(`errors:rpc.${editor.errorCode}`)} />
      ) : null}
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
