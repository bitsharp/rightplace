import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, type AvatarPhoto } from '@/components/ui/Avatar';
import { Glow } from '@/components/ui/Glow';
import type { Intent } from '@/features/nights/domain/band';
import { colors } from '@/theme/tokens';

type Props = {
  intent: Intent;
  // My own initial and photo: only I (and nobody else) see them here, so principle 1 holds.
  initial: string;
  photo?: AvatarPhoto;
  onPress: () => void;
  // The photo finished loading or failed: the marker bitmap waits for it (see usePhotoWait).
  onPhotoSettled?: () => void;
};

const AVATAR = 40;
const RING = 3;
const GLOW_RADIUS = 36;

const RING_COLOR: Record<Intent, string> = { going: colors.primary, maybe: colors.maybe };

// "My night" on the venue I declared: my face in a thick ring (violet "going", cyan "maybe") so it is never
// mistaken for a friend's face. Shown to me whatever the turnout (it is my own data).
export function OwnSpot({ intent, initial, photo, onPress, onPhotoSettled }: Props) {
  const { t } = useTranslation('map');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(`own.marker.${intent}`)}
      onPress={onPress}
      style={styles.box}
    >
      <Glow testID="own-glow" color={RING_COLOR[intent]} radius={GLOW_RADIUS} style={styles.glow} />
      <View testID="own-ring" style={[styles.ring, { borderColor: RING_COLOR[intent] }]}>
        <Avatar
          intent={intent}
          initial={initial}
          size={AVATAR}
          photo={photo}
          onPhotoSettled={onPhotoSettled}
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: GLOW_RADIUS * 2,
    height: GLOW_RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: { top: 0, left: 0 },
  ring: { padding: 0, borderWidth: RING, borderRadius: (AVATAR + RING * 2) / 2 },
});
