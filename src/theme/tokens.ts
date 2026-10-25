// Bootstrap palette from CLAUDE.md; spacing, radius and typography arrive with prompt 03.
export const colors = {
  background: '#0B0B12',
  surface: '#15151F',
  border: '#2A2A3A',
  primary: '#9D6BFF',
  secondary: '#4ED9C7',
  text: '#F2F1F8',
  textSecondary: '#A3A1B8',
  genderFemale: '#F2B1CB',
  genderMale: '#86B6E3',
} as const;

export const layout = {
  tabBarHeight: 72,
} as const;

export const fonts = {
  display: 'Unbounded_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;
