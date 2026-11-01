import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

import { ButtonsSection, FieldsSection, SelectionSection } from './ControlsSections';
import { MapSection, StatesSection } from './DataSections';
import { ColorsSection, TypographySection } from './FoundationsSections';
import { CreatorSection, NavigationSection, SocialSection } from './SocialSections';

// Dev-only gallery to compare every component side by side with design/project/*.dc.html.
export function UiKitScreen() {
  const { t } = useTranslation('dev');
  return (
    <Screen scroll>
      <Text accessibilityRole="header" variant="display26">
        {t('title')}
      </Text>
      <ColorsSection />
      <TypographySection />
      <ButtonsSection />
      <SelectionSection />
      <FieldsSection />
      <StatesSection />
      <MapSection />
      <SocialSection />
      <CreatorSection />
      <NavigationSection />
    </Screen>
  );
}
