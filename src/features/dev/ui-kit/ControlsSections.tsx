import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { PasswordField } from '@/components/ui/PasswordField';
import { SearchField } from '@/components/ui/SearchField';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import { Toggle } from '@/components/ui/Toggle';

import { Row, Section } from './Section';

const noop = () => undefined;

export function ButtonsSection() {
  const { t } = useTranslation('dev');
  const [sheetOpen, setSheetOpen] = useState(false);
  return (
    <Section name="buttons">
      <Button label={t('sample.declare')} onPress={noop} feedback="confirm" />
      <Button label={t('sample.maybe')} variant="secondary" onPress={noop} />
      <Button label={t('sample.publish')} variant="creator" onPress={noop} />
      <Row>
        <Button label={t('sample.edit')} variant="ghost" size="md" onPress={noop} />
        <Button label={t('sample.confirmCancel')} variant="danger" size="md" onPress={noop} />
      </Row>
      <Row>
        <Button label={t('sample.loading')} size="md" loading onPress={noop} />
        <Button label={t('sample.disabled')} size="md" disabled onPress={noop} />
      </Row>
      <Button label={t('sample.openSheet')} variant="ghost" onPress={() => setSheetOpen(true)} />
      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text variant="display17">{t('sample.openSheet')}</Text>
        <Text color="textSecondary">{t('sample.sheetBody')}</Text>
      </Sheet>
    </Section>
  );
}

export function SelectionSection() {
  return (
    <Section name="selection">
      <ChipsDemo />
      <SegmentsDemo />
      <TogglesDemo />
    </Section>
  );
}

function ChipsDemo() {
  const { t } = useTranslation('dev');
  const [type, setType] = useState('club');
  const types = ['club', 'bar', 'rooftop', 'live'] as const;
  return (
    <Row>
      <Chip label={t('sample.allCities')} selected onPress={noop} />
      {types.map((value) => (
        <Chip
          key={value}
          label={t(`sample.${value}`)}
          tone="maybe"
          selected={type === value}
          onPress={() => setType(value)}
        />
      ))}
    </Row>
  );
}

function SegmentsDemo() {
  const { t } = useTranslation('dev');
  const { t: tUi } = useTranslation('ui');
  const [view, setView] = useState<'general' | 'friends'>('general');
  const [who, setWho] = useState<'going' | 'maybe' | 'all'>('going');
  const views = [
    { value: 'general', label: t('sample.general') },
    { value: 'friends', label: t('sample.friendsMap') },
  ] as const;
  const intents = [
    { value: 'going', label: tUi('intent.goingAction'), tone: 'going' },
    { value: 'maybe', label: tUi('intent.maybeAction'), tone: 'maybe' },
    { value: 'all', label: t('sample.all'), tone: 'neutral' },
  ] as const;
  return (
    <>
      <SegmentedControl options={views} value={view} onChange={setView} />
      <SegmentedControl options={intents} value={who} onChange={setWho} />
    </>
  );
}

function TogglesDemo() {
  const { t } = useTranslation('dev');
  const [location, setLocation] = useState(true);
  const [contacts, setContacts] = useState(false);
  return (
    <>
      <Toggle
        icon="map"
        title={t('sample.location')}
        description={t('sample.locationBody')}
        value={location}
        onValueChange={setLocation}
      />
      <Toggle
        icon="contacts"
        title={t('sample.contacts')}
        description={t('sample.contactsBody')}
        optional
        value={contacts}
        onValueChange={setContacts}
      />
    </>
  );
}

export function FieldsSection() {
  const { t } = useTranslation('dev');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return (
    <Section name="fields">
      <TextField
        label={t('sample.email')}
        placeholder={t('sample.emailPlaceholder')}
        keyboardType="email-address"
        autoCapitalize="none"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label={t('sample.email')}
        value="nome@"
        onChangeText={noop}
        error={t('sample.emailError')}
      />
      <PasswordField
        label={t('sample.password')}
        placeholder={t('sample.passwordPlaceholder')}
        value={password}
        onChangeText={setPassword}
      />
      <SearchDemo />
    </Section>
  );
}

function SearchDemo() {
  const { t } = useTranslation('dev');
  const [query, setQuery] = useState('');
  return (
    <>
      <SearchField
        label={t('sample.search')}
        placeholder={t('sample.search')}
        value={query}
        onChangeText={setQuery}
      />
      <SearchField
        label={t('sample.searchHandle')}
        placeholder={t('sample.searchHandle')}
        prefix="handle"
        value=""
        onChangeText={noop}
      />
    </>
  );
}
