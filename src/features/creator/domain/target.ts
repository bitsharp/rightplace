// The form offers three age chips; the database keeps four bands. "35+" stands for both 35-44 and 45+.
export type AgeChip = '18-24' | '25-34' | '35+';
export type GenderChip = 'all' | 'female' | 'male';

const AGE_CHIPS: readonly AgeChip[] = ['18-24', '25-34', '35+'];
const BANDS_OF_CHIP: Record<AgeChip, readonly string[]> = {
  '18-24': ['18-24'],
  '25-34': ['25-34'],
  '35+': ['35-44', '45+'],
};

export type TargetArrays = { ageBands: string[]; genders: string[] };

// Empty arrays mean "everybody" (the server default), so no chip and "Tutti" send nothing.
export function toTargetArrays(ages: readonly AgeChip[], gender: GenderChip): TargetArrays {
  return {
    ageBands: AGE_CHIPS.filter((chip) => ages.includes(chip)).flatMap((chip) => [
      ...BANDS_OF_CHIP[chip],
    ]),
    genders: gender === 'all' ? [] : [gender],
  };
}

export function fromTargetArrays(
  ageBands: readonly string[],
  genders: readonly string[],
): { ages: AgeChip[]; gender: GenderChip } {
  const only = genders.length === 1 ? genders[0] : undefined;
  return {
    ages: AGE_CHIPS.filter((chip) => BANDS_OF_CHIP[chip].every((band) => ageBands.includes(band))),
    gender: only === 'female' || only === 'male' ? only : 'all',
  };
}
