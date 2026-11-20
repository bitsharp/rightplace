import { Text as RNText } from 'react-native';

import { linkify } from '@/features/chat/domain/linkify';
import { useLinkActions } from '@/lib/links/linkActionsStore';
import { openLink } from '@/lib/links/links';
import { colors, type ColorToken } from '@/theme/tokens';

import { Text } from './Text';

type Props = Omit<React.ComponentProps<typeof Text>, 'children'> & {
  text: string;
  linkColor?: ColorToken;
  // Default: the link actions sheet (open / copy). A text inside a Modal handles it itself.
  onLinkLongPress?: (url: string) => void;
};

// Text where http(s) and www. links are tappable (system browser) and copyable on long press.
export function LinkedText({ text, linkColor = 'maybe', onLinkLongPress, ...rest }: Props) {
  const openSheet = useLinkActions((state) => state.openSheet);
  const segments = linkify(text);
  // Without links the text stays a plain string child.
  if (segments.every((segment) => segment.kind === 'text')) return <Text {...rest}>{text}</Text>;
  return (
    <Text {...rest}>
      {segments.map((segment, index) =>
        segment.kind === 'text' ? (
          segment.text
        ) : (
          <RNText
            key={`${index}-${segment.url}`}
            accessibilityRole="link"
            onPress={() => void openLink(segment.url)}
            onLongPress={() => (onLinkLongPress ?? openSheet)(segment.url)}
            style={{ color: colors[linkColor], textDecorationLine: 'underline' }}
          >
            {segment.text}
          </RNText>
        ),
      )}
    </Text>
  );
}
