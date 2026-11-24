import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, View } from 'react-native';

import { MessageBubble } from '@/components/app/MessageBubble';
import { Button } from '@/components/ui/Button';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { spacing } from '@/theme/tokens';

import { withDaySeparators, type DmListItem, type DmMessage } from '../domain/messages';

type Props = {
  messages: DmMessage[];
  hasMore: boolean;
  onLoadOlder: () => void;
  onLongPress: (message: DmMessage) => void;
};

// Inverted: the newest message sits at the bottom, the day label above the first message of each day.
export function DmMessageList({ messages, hasMore, onLoadOlder, onLongPress }: Props) {
  const { t, i18n } = useTranslation('dm');
  const dayLabel = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const renderItem = ({ item }: { item: DmListItem }) =>
    item.type === 'day' ? (
      <View style={styles.day}>
        <MonoLabel tone="muted">{dayLabel.format(new Date(item.day))}</MonoLabel>
      </View>
    ) : (
      <MessageBubble
        author={item.message.isMine ? 'me' : 'other'}
        content={{ kind: 'text', text: item.message.text }}
        onLongPress={() => onLongPress(item.message)}
      />
    );
  return (
    <FlatList
      inverted
      data={withDaySeparators(messages)}
      keyExtractor={(item) => (item.type === 'day' ? `day-${item.day}` : item.message.id)}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      onEndReached={hasMore ? onLoadOlder : undefined}
      renderItem={renderItem}
      ListFooterComponent={
        hasMore ? (
          <Button label={t('thread.loadOlder')} variant="ghost" size="md" onPress={onLoadOlder} />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md, paddingVertical: spacing.md },
  day: { alignItems: 'center' },
});
