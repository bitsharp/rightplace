import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

export function Divider() {
  return <View testID="divider" style={styles.divider} />;
}

const styles = StyleSheet.create({
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    alignSelf: 'stretch',
  },
});
