import { StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

type Props = {
  step: string;
  title: string;
  body?: string;
  brand?: string;
};

// "01 / 03 · ACCESSO" + brand + big title, as in Main.dc.html and Profilo.dc.html.
export function AuthHeader({ step, title, body, brand }: Props) {
  return (
    <View style={styles.header}>
      <MonoLabel tone="going" size="large">
        {step}
      </MonoLabel>
      <View style={styles.texts}>
        {brand ? (
          <Text variant="display22" color="primary">
            {brand}
          </Text>
        ) : null}
        <Text accessibilityRole="header" variant="display30">
          {title}
        </Text>
        {body ? <Text color="textSecondary">{body}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: spacing.xl, paddingTop: spacing.xl },
  texts: { gap: spacing.md },
});
