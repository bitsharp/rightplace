import type { Story } from '@/components/app/TopBar';

// Gallery-only sample data: obviously fake venues and handles, never seed data (CLAUDE.md).
export const SAMPLE_HANDLE = 'lince.rosso';
export const SAMPLE_VENUE = 'Demo Club';
export const SAMPLE_ROOFTOP = 'Demo Rooftop';
export const SAMPLE_FRIENDS = ['volpe.viola', 'orso.grigio'];

export const SAMPLE_STORIES: Story[] = [
  { id: 'me', handle: SAMPLE_HANDLE, initial: 'L', tone: 'neutral', mine: true },
  { id: 'volpe', handle: 'volpe.viola', initial: 'V', tone: 'going' },
  { id: 'gatto', handle: 'gatto.blu', initial: 'G', tone: 'maybe' },
];
