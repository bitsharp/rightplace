import { Pressable, View, type ViewProps } from 'react-native';

type Props = ViewProps & { onPress?: () => void };

// Map markers: on iOS one Pressable around the whole marker takes the tap, so the content itself must not
// intercept it. Without onPress this is a plain, still accessible, View.
export function TapTarget({ onPress, children, ...props }: Props) {
  if (!onPress)
    return (
      <View accessible {...props}>
        {children}
      </View>
    );
  return (
    <Pressable onPress={onPress} {...props}>
      {children}
    </Pressable>
  );
}
