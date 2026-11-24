import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { Text } from '@/components/ui/Text';
import { useCreatorUi } from '@/features/creator/useCreatorUi';
import type { Language } from '@/i18n/domain/pickLanguage';
import { spacing } from '@/theme/tokens';

import type { ProfileInput } from '../api';
import { BirthDateField } from './BirthDateField';
import { ContactsToggle, GenderPicker, LanguagePicker, LocationToggle } from './ProfileFields';
import { useProfileFormState, type ProfileFormInitial } from './useProfileFormState';

type Props = {
  initial: ProfileFormInitial;
  submitLabel: string;
  onSubmit: (input: ProfileInput) => Promise<void> | void;
  errorMessage?: string;
  underageAction?: ReactNode;
  onLanguageChange?: (locale: Language) => void;
  // "personal" = age, gender and creator only: language, position and contacts have their own settings screens
  fields?: 'all' | 'personal';
};

type FormState = ReturnType<typeof useProfileFormState>;

// Profilo.dc.html / ProfiloApp.dc.html: same fields for onboarding and the Profile tab.
export function ProfileForm({ initial, submitLabel, onSubmit, errorMessage, ...rest }: Props) {
  const form = useProfileFormState(initial);
  const [submitting, setSubmitting] = useState(false);
  const submit = async () => {
    if (!form.input) return;
    setSubmitting(true);
    try {
      await onSubmit(form.input);
    } finally {
      setSubmitting(false);
    }
  };
  return (
    <View style={styles.form}>
      <ProfileFields
        form={form}
        underageAction={rest.underageAction}
        onLanguageChange={rest.onLanguageChange}
        fields={rest.fields ?? 'all'}
      />
      {errorMessage ? <Text color="error">{errorMessage}</Text> : null}
      <Button
        label={submitLabel}
        onPress={submit}
        disabled={!form.input}
        loading={submitting}
        feedback="confirm"
      />
    </View>
  );
}

type FieldsProps = Pick<Props, 'underageAction' | 'onLanguageChange'> & {
  form: FormState;
  fields: NonNullable<Props['fields']>;
};

function ProfileFields({
  form: { values, setters, underage },
  underageAction,
  onLanguageChange,
  fields,
}: FieldsProps) {
  const { t } = useTranslation('profile');
  const { showCreatorToggle } = useCreatorUi();
  const changeLanguage = (locale: Language) => {
    setters.setLocale(locale);
    onLanguageChange?.(locale);
  };
  return (
    <>
      <BirthDateField value={values.dateParts} onChange={setters.setDateParts} />
      {underage ? <UnderageNotice action={underageAction} /> : null}
      <GenderPicker value={values.gender} onChange={setters.setGender} />
      {fields === 'all' ? (
        <>
          <LocationToggle value={values.locationOptIn} onChange={setters.setLocationOptIn} />
          <ContactsToggle value={values.contactsOptIn} onChange={setters.setContactsOptIn} />
        </>
      ) : null}
      {showCreatorToggle ? (
        <Checkbox
          label={t('form.creator')}
          checked={values.isCreator}
          onChange={setters.setIsCreator}
        />
      ) : null}
      {fields === 'all' ? <LanguagePicker value={values.locale} onChange={changeLanguage} /> : null}
    </>
  );
}

function UnderageNotice({ action }: { action?: ReactNode }) {
  const { t } = useTranslation('profile');
  return (
    <View style={styles.notice}>
      <Text color="error">{t('form.underage')}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  notice: { gap: spacing.sm },
});
