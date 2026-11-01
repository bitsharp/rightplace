import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { heights } from '@/theme/tokens';

import { Icon } from './Icon';
import { TextField } from './TextField';

type Props = Omit<React.ComponentProps<typeof TextField>, 'secureTextEntry' | 'trailing'>;

export function PasswordField(props: Props) {
  const { t } = useTranslation('ui');
  const [visible, setVisible] = useState(false);

  const toggle = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={visible ? t('password.hide') : t('password.show')}
      onPress={() => setVisible((current) => !current)}
      style={styles.toggle}
    >
      <Icon name={visible ? 'eyeOff' : 'eye'} color="textSecondary" />
    </Pressable>
  );

  return (
    <TextField
      autoCapitalize="none"
      autoCorrect={false}
      textContentType="password"
      {...props}
      secureTextEntry={!visible}
      trailing={toggle}
    />
  );
}

const styles = StyleSheet.create({
  toggle: {
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
