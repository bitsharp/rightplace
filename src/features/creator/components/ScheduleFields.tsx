import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { wallTimeIn } from '../domain/zonedTime';
import { StepPicker } from './StepPicker';

const STEP_MINUTES = 30;
const DAY_MINUTES = 24 * 60;

type Props = {
  startsAt: Date;
  endsAt: Date;
  timeZone: string;
  onShiftStart: (minutes: number) => void;
  onShiftEnd: (minutes: number) => void;
  startError?: string;
  endError?: string;
};

function useFormatters(timeZone: string) {
  const { i18n } = useTranslation('creator');
  const day = new Intl.DateTimeFormat(i18n.language, {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = new Intl.DateTimeFormat(i18n.language, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  return { day: (date: Date) => day.format(date), time: (date: Date) => time.format(date) };
}

// "Orario" (CreaSerata.dc.html): the city's clock, in 30-minute steps; the end is capped at 06:00.
export function ScheduleFields(props: Props) {
  const { t } = useTranslation('creator');
  const format = useFormatters(props.timeZone);
  return (
    <View style={styles.block}>
      <Text variant="body13Medium" color="textSecondary">
        {t('form.time.label')}
      </Text>
      <StartPickers {...props} format={format} />
      <EndPicker {...props} format={format} />
    </View>
  );
}

type Format = ReturnType<typeof useFormatters>;

function StartPickers({ startsAt, onShiftStart, startError, format }: Props & { format: Format }) {
  const { t } = useTranslation('creator');
  return (
    <>
      <StepPicker
        label={t('form.time.startDay')}
        valueLabel={format.day(startsAt)}
        previousLabel={t('form.time.previousDay')}
        nextLabel={t('form.time.nextDay')}
        onPrevious={() => onShiftStart(-DAY_MINUTES)}
        onNext={() => onShiftStart(DAY_MINUTES)}
      />
      <StepPicker
        label={t('form.time.start')}
        valueLabel={format.time(startsAt)}
        previousLabel={t('form.time.startEarlier')}
        nextLabel={t('form.time.startLater')}
        onPrevious={() => onShiftStart(-STEP_MINUTES)}
        onNext={() => onShiftStart(STEP_MINUTES)}
      />
      <FieldError message={startError} />
    </>
  );
}

function EndPicker({
  startsAt,
  endsAt,
  timeZone,
  onShiftEnd,
  endError,
  format,
}: Props & { format: Format }) {
  const { t } = useTranslation('creator');
  const endsNextDay = wallTimeIn(endsAt, timeZone).day !== wallTimeIn(startsAt, timeZone).day;
  const endTime = format.time(endsAt);
  return (
    <>
      <StepPicker
        label={t('form.time.end')}
        valueLabel={endsNextDay ? t('form.time.endNextDay', { time: endTime }) : endTime}
        previousLabel={t('form.time.endEarlier')}
        nextLabel={t('form.time.endLater')}
        onPrevious={() => onShiftEnd(-STEP_MINUTES)}
        onNext={() => onShiftEnd(STEP_MINUTES)}
      />
      <FieldError message={endError} />
    </>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <Text variant="body13" color="error">
      {message}
    </Text>
  );
}

const styles = StyleSheet.create({ block: { gap: spacing.md } });
