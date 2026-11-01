import { useState } from 'react';

import type { Language } from '@/i18n/domain/pickLanguage';

import type { Gender, ProfileInput } from '../api';
import { isAdultOn, parseBirthDate } from '../domain/birthDate';
import type { BirthDateParts } from './BirthDateField';

export type ProfileFormInitial = Omit<ProfileInput, 'birthDate' | 'gender'> & {
  birthDate: string | null;
  gender: Gender | null;
};

function toParts(isoDate: string | null): BirthDateParts {
  const [year = '', month = '', day = ''] = isoDate?.split('-') ?? [];
  return { day, month, year };
}

export function useProfileFormState(initial: ProfileFormInitial) {
  const [dateParts, setDateParts] = useState(() => toParts(initial.birthDate));
  const [gender, setGender] = useState<Gender | null>(initial.gender);
  const [locale, setLocale] = useState<Language>(initial.locale);
  const [locationOptIn, setLocationOptIn] = useState(initial.locationOptIn);
  const [contactsOptIn, setContactsOptIn] = useState(initial.contactsOptIn);
  const [isCreator, setIsCreator] = useState(initial.isCreator);

  const birthDate = parseBirthDate(dateParts);
  const underage = birthDate !== null && !isAdultOn(birthDate, new Date());
  const input: ProfileInput | null =
    birthDate && gender && !underage
      ? { birthDate, gender, locale, locationOptIn, contactsOptIn, isCreator }
      : null;

  return {
    values: { dateParts, gender, locale, locationOptIn, contactsOptIn, isCreator },
    setters: {
      setDateParts,
      setGender,
      setLocale,
      setLocationOptIn,
      setContactsOptIn,
      setIsCreator,
    },
    underage,
    input,
  };
}
