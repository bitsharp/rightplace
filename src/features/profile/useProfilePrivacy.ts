import { useState } from 'react';

import type { RpcErrorCode } from '@/lib/rpcError';

import type { MyProfile } from './api';
import { useUpdateProfile } from './useUpdateProfile';

type Field = 'locationOptIn' | 'contactsOptIn';

// Position and contacts are consents: each switch is saved as soon as it moves, and goes back if the save fails.
export function useProfilePrivacy(profile: MyProfile) {
  const update = useUpdateProfile();
  const [values, setValues] = useState({
    locationOptIn: profile.locationOptIn,
    contactsOptIn: profile.contactsOptIn,
  });
  const [error, setError] = useState<RpcErrorCode | null>(null);

  const change = (field: Field) => async (next: boolean) => {
    const previous = values[field];
    setValues((current) => ({ ...current, [field]: next }));
    const code = await update({ [field]: next });
    setError(code);
    if (code) setValues((current) => ({ ...current, [field]: previous }));
  };

  return {
    ...values,
    error,
    setLocationOptIn: change('locationOptIn'),
    setContactsOptIn: change('contactsOptIn'),
  };
}
