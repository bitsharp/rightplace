// Design tokens taken from design/project/*.dc.html. The only place (with mapStyle.ts) where hex colours live.
const palette = {
  background: '#0B0B12',
  surface: '#15151F',
  border: '#2A2A3A',
  violet: '#9D6BFF',
  cyan: '#4ED9C7',
  text: '#F2F1F8',
  textSecondary: '#A3A1B8',
  female: '#F2B1CB',
  male: '#86B6E3',
  mapCanvas: '#101019',
  surface3: '#3A3A4E',
  // Not in the mock-up: needed for form errors (prompt 05), kept warm so it never reads as "Forse".
  error: '#FF7A90',
} as const;

export function withAlpha(hex: string, alpha: number): string {
  const channel = Math.round(alpha * 255)
    .toString(16)
    .toUpperCase()
    .padStart(2, '0');
  return `${hex}${channel}`;
}

export const colors = {
  background: palette.background,
  surface: palette.surface,
  border: palette.border,
  primary: palette.violet,
  secondary: palette.cyan,
  going: palette.violet,
  maybe: palette.cyan,
  text: palette.text,
  textSecondary: palette.textSecondary,
  onAccent: palette.background,
  female: palette.female,
  male: palette.male,
  mapCanvas: palette.mapCanvas,
  typicalDot: palette.surface3,
  error: palette.error,
  overlay: withAlpha(palette.background, 0.9),
  backdrop: withAlpha(palette.background, 0.7),
  goingTint: withAlpha(palette.violet, 0x22 / 255),
  goingSoft: withAlpha(palette.violet, 0.2),
  goingBorder: withAlpha(palette.violet, 0.4),
  goingFill: withAlpha(palette.violet, 0.28),
  maybeTint: withAlpha(palette.cyan, 0.1),
  maybeSoft: withAlpha(palette.cyan, 0.2),
  maybeBorder: withAlpha(palette.cyan, 0.4),
  maybeFill: withAlpha(palette.cyan, 0.3),
  neutralSoft: withAlpha(palette.textSecondary, 0.33),
  youHalo: withAlpha(palette.text, 0.1),
  photoLabel: withAlpha(palette.text, 0.67),
} as const;

export type ColorToken = keyof typeof colors;

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 } as const;

export const radius = {
  card: 16,
  cardLarge: 18,
  button: 14,
  buttonLarge: 16,
  segmented: 12,
  segmentedInner: 9,
  pill: 999,
} as const;

export const heights = {
  button: 56,
  buttonMedium: 44,
  field: 52,
  search: 48,
  segmented: 36,
  chip: 36,
  tabBar: 72,
  minTapTarget: 44,
} as const;

// Neon glow for map markers: iOS uses the shadow, Android falls back to elevation-free halo rings.
export const glow = {
  shadowOpacity: 0.7,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 0 },
} as const;

// Placeholder "scenes" for photos without an image (Feed/Chat mock-up gradients).
export const photoScenes = [
  { from: '#14121F', stops: [palette.violet, palette.cyan, '#FF5FA2'] },
  { from: '#241649', stops: ['#7B3F9E', '#FF8A5B', '#120E1C'] },
  { from: '#0E1B2B', stops: [palette.cyan, palette.violet, '#1B1230'] },
  { from: '#17111F', stops: ['#FFD37A', palette.violet, '#17111F'] },
] as const;

export const fonts = {
  display: 'Unbounded_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodyStrong: 'Inter_600SemiBold',
  mono: 'SpaceMono_400Regular',
  monoBold: 'SpaceMono_700Bold',
} as const;
