import { useTranslation } from 'react-i18next';

import { SegmentedControl } from '@/components/ui/SegmentedControl';

import type { MapViewMode } from '../store/mapStore';

type Props = { view: MapViewMode; onChange: (view: MapViewMode) => void };

export function MapViewSwitch({ view, onChange }: Props) {
  const { t } = useTranslation('map');
  return (
    <SegmentedControl
      options={[
        { value: 'general', label: t('view.general') },
        { value: 'friends', label: t('view.friends') },
      ]}
      value={view}
      onChange={onChange}
    />
  );
}
