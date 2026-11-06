import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { RangeStat } from '@/components/ui/RangeStat';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import type { Band } from '@/features/nights/domain/band';
import type { RpcErrorCode } from '@/lib/rpcError';
import { spacing } from '@/theme/tokens';

import type { DeclarationState, DeclarationTarget } from '../domain/declarationState';
import { formatTime } from '../domain/formatTime';
import { AskAi } from './AskAi';
import { ConfirmInline, DeclaredCard, DeclareChoice, RemoveIconLink } from './DeclarationControls';
import { useDeclarationActions } from './useDeclarationActions';

type SheetVenue = {
  id: string;
  name: string;
  // Heading of the sheet when it is not the venue's name (a creator's night).
  title?: string;
  timezone: string;
  goingBand: Band;
  maybeBand: Band;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  target: DeclarationTarget;
  venue: SheetVenue;
  state: DeclarationState;
};

// Same body for a venue night and, from prompt 12, for a creator's event: only `target` differs.
export function DeclarationSheet({ visible, onClose, ...body }: Props) {
  return (
    <Sheet visible={visible} onClose={onClose}>
      <SheetBody onClose={onClose} {...body} />
    </Sheet>
  );
}

function SheetBody({ onClose, target, venue, state }: Omit<Props, 'visible'>) {
  const { t } = useTranslation('venue');
  const { height } = useWindowDimensions();
  const actions = useDeclarationActions({ target, venue, state, onClose });

  return (
    <ScrollView style={{ maxHeight: height * 0.75 }} contentContainerStyle={styles.content}>
      <MonoLabel tone="going">{t('declare.label')}</MonoLabel>
      <Text variant="display22">{venue.title ?? venue.name}</Text>
      <View style={styles.bands}>
        <RangeStat intent="going" band={venue.goingBand} />
        <RangeStat intent="maybe" band={venue.maybeBand} />
      </View>
      {state.kind === 'here' ? (
        <DeclaredCard
          intent={state.intent}
          busy={actions.busy}
          confirming={actions.confirming}
          onEdit={actions.edit}
          onCancel={() => actions.ask('cancel')}
        />
      ) : (
        <DeclareChoice state={state} busy={actions.busy} onChoose={actions.choose} />
      )}
      {actions.confirming ? (
        <ConfirmInline
          kind={actions.confirming}
          onYes={actions.confirm}
          onNo={actions.dismissConfirm}
        />
      ) : null}
      <ErrorLine code={actions.errorCode} />
      <ExpiryNote state={state} timeZone={venue.timezone} />
      <AskAi />
      {state.kind === 'here' ? <RemoveIconLink onPress={() => actions.ask('remove')} /> : null}
    </ScrollView>
  );
}

function ErrorLine({ code }: { code: RpcErrorCode | null }) {
  const { t } = useTranslation('venue');
  if (!code) return null;
  return (
    <Text variant="body13" color="error">
      {t(`errors:rpc.${code}`)}
    </Text>
  );
}

function ExpiryNote({ state, timeZone }: { state: DeclarationState; timeZone: string }) {
  const { t, i18n } = useTranslation('venue');
  const text =
    state.kind === 'here'
      ? t('declare.expiresAt', { time: formatTime(state.expiresAt, timeZone, i18n.language) })
      : t('declare.expiresGeneric');
  return (
    <Text variant="body12" color="textSecondary">
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  bands: { flexDirection: 'row', gap: spacing.md },
});
