import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { DESCRIPTION_MAX, NAME_MAX } from '../domain/eventForm';
import type { CityVenue } from '@/features/venues/domain/venueList';
import { spacing } from '@/theme/tokens';

import type { useEventForm } from '../useEventForm';
import { ScheduleFields } from './ScheduleFields';
import { TargetChips } from './TargetChips';
import { VenuePicker } from './VenuePicker';

type Props = {
  form: ReturnType<typeof useEventForm>;
  venues: readonly CityVenue[];
  mode: 'create' | 'edit';
};

type FormProps = Props['form'];
const errorText = (t: (key: string) => string, key: string | undefined) =>
  key ? t(`form.errors.${key}`) : undefined;

// One form for "Crea serata" and "Modifica serata" (CreaSerata.dc.html); the venue is fixed when editing.
export function EventForm({ form, venues, mode }: Props) {
  const { t } = useTranslation('creator');
  return (
    <View style={styles.form}>
      <VenuePicker
        venues={venues}
        value={form.venueId}
        onChange={form.setVenueId}
        error={errorText(t, form.errors.venue)}
        locked={mode === 'edit'}
      />
      <TextFields form={form} />
      <ScheduleFields
        startsAt={form.startsAt}
        endsAt={form.endsAt}
        timeZone={form.timeZone}
        onShiftStart={form.shiftStart}
        onShiftEnd={form.shiftEnd}
        startError={errorText(t, form.errors.startsAt)}
        endError={errorText(t, form.errors.endsAt)}
      />
      <View style={styles.target}>
        <Text variant="body13Medium" color="textSecondary">
          {t('form.target.label')}
        </Text>
        <TargetChips
          ages={form.ages}
          gender={form.gender}
          onAges={form.setAges}
          onGender={form.setGender}
        />
      </View>
      <SubmitArea form={form} mode={mode} />
    </View>
  );
}

function TextFields({ form }: { form: FormProps }) {
  const { t } = useTranslation('creator');
  return (
    <>
      <TextField
        label={t('form.name.label')}
        placeholder={t('form.name.placeholder')}
        value={form.name}
        onChangeText={form.setName}
        maxLength={NAME_MAX + 20}
        error={errorText(t, form.errors.name)}
      />
      <View style={styles.description}>
        <TextField
          label={t('form.description.label')}
          placeholder={t('form.description.placeholder')}
          value={form.description}
          onChangeText={form.setDescription}
          multiline
          error={errorText(t, form.errors.description)}
        />
        <Text variant="body12" color="textSecondary" style={styles.counter}>
          {t('form.description.counter', { count: form.description.length, max: DESCRIPTION_MAX })}
        </Text>
      </View>
    </>
  );
}

function SubmitArea({ form, mode }: { form: FormProps; mode: Props['mode'] }) {
  const { t } = useTranslation('creator');
  return (
    <>
      {form.serverError ? (
        <Text variant="body13" color="error">
          {t(`errors:rpc.${form.serverError}`)}
        </Text>
      ) : null}
      <Button
        label={t(mode === 'edit' ? 'form.save' : 'form.submit')}
        variant="creator"
        loading={form.submitting}
        feedback="confirm"
        onPress={form.submit}
      />
    </>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  description: { gap: spacing.xs },
  counter: { textAlign: 'right' },
  target: { gap: spacing.md },
});
