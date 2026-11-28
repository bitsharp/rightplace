import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { RangeStat } from '@/components/ui/RangeStat';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { onDeclarationSheetDismiss } from '@/features/notifications/prePermission';
import type { Band } from '@/features/nights/domain/band';
import { afterModalDismiss } from '@/lib/afterModalDismiss';
import type { RpcErrorCode } from '@/lib/rpcError';
import { spacing } from '@/theme/tokens';

import type { DeclarationState, DeclarationTarget } from '../domain/declarationState';
import { formatTime } from '../domain/formatTime';
import { AskAi } from './AskAi';
import { ConfirmInline, DeclaredCard, DeclareChoice, RemoveIconLink } from './DeclarationControls';
import { NightFriends, NightTransport, NightVenueCard, type NightContext } from './YourNight';
import { useDeclarationActions } from './useDeclarationActions';

type SheetVenue = {
  id: string;
  name: string;
  // Heading of the sheet when it is not the venue's name (a creator's night).
  title?: string;
  timezone: string;
  // null for a spot below k = 3: the sheet then shows no numbers at all.
  goingBand: Band | null;
  maybeBand: Band | null;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  target: DeclarationTarget;
  venue: SheetVenue;
  state: DeclarationState;
  // The venue page passes what "La tua serata" shows around my declaration; a creator's night has none.
  night?: NightContext;
};

// Same body for a venue night and, from prompt 12, for a creator's event: only `target` differs.
export function DeclarationSheet({ visible, onClose, ...body }: Props) {
  const openFriend = body.night?.onOpenFriend;
  // A profile is another screen: on iOS it opens only once the sheet's Modal is gone.
  const deferred = useMemo(
    () => afterModalDismiss<string>(Platform.OS, (handle) => openFriend?.(handle)),
    [openFriend],
  );
  const night = body.night && {
    ...body.night,
    onOpenFriend: (handle: string) => {
      onClose();
      deferred.request(handle);
    },
  };
  const onDismiss = () => {
    onDeclarationSheetDismiss();
    deferred.onDismiss();
  };
  return (
    <Sheet visible={visible} onClose={onClose} onDismiss={onDismiss}>
      <SheetBody onClose={onClose} {...body} night={night} />
    </Sheet>
  );
}

function SheetBody({ onClose, target, venue, state, night }: Omit<Props, 'visible'>) {
  const { height } = useWindowDimensions();
  const actions = useDeclarationActions({
    target,
    venue,
    state,
    onClose,
    stayOpenAfterDeclare: night !== undefined && state.kind !== 'here',
  });

  return (
    <ScrollView style={{ maxHeight: height * 0.75 }} contentContainerStyle={styles.content}>
      {night && state.kind === 'here' ? (
        <YourNightTop venue={venue} night={night} onOpenVenue={onClose} />
      ) : (
        <SheetTitle venue={venue} />
      )}
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
      {night && state.kind === 'here' ? <YourNightBottom night={night} /> : null}
      <AskAi />
      {state.kind === 'here' ? <RemoveIconLink onPress={() => actions.ask('remove')} /> : null}
    </ScrollView>
  );
}

function SheetTitle({ venue }: { venue: SheetVenue }) {
  const { t } = useTranslation('venue');
  return (
    <>
      <MonoLabel tone="going">{t('declare.label')}</MonoLabel>
      <Text variant="display22">{venue.title ?? venue.name}</Text>
      {venue.goingBand !== null && venue.maybeBand !== null ? (
        <View style={styles.bands}>
          <RangeStat intent="going" band={venue.goingBand} />
          <RangeStat intent="maybe" band={venue.maybeBand} />
        </View>
      ) : null}
    </>
  );
}

type NightTopProps = { venue: SheetVenue; night: NightContext; onOpenVenue: () => void };

// "LA TUA SERATA": the title and the venue card; the declared card (edit / cancel) follows as the main action.
function YourNightTop({ venue, night, onOpenVenue }: NightTopProps) {
  const { t } = useTranslation('venue');
  return (
    <>
      <Text accessibilityRole="header" variant="display30">
        {t('declare.label')}
      </Text>
      <NightVenueCard
        name={venue.name}
        photoUrl={night.photoUrl}
        kind={night.kind}
        address={night.address}
        status={night.status}
        onPress={onOpenVenue}
      />
    </>
  );
}

function YourNightBottom({ night }: { night: NightContext }) {
  return (
    <>
      <NightTransport links={night.links} onOpen={night.onOpenLink} />
      <NightFriends
        friends={night.friends}
        urls={night.urls}
        myHandle={night.myHandle}
        onOpenFriend={night.onOpenFriend}
      />
    </>
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
