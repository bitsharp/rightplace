import { z } from 'zod';

import { toTargetArrays, type AgeChip, type GenderChip } from './target';
import { instantFromWallTime, nightEndOf, shiftWallTime, wallTimeIn } from './zonedTime';

export const NAME_MAX = 80;
export const DESCRIPTION_MAX = 500;
export const MAX_DAYS_AHEAD = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const DEFAULT_START_HOUR = 22;
const DEFAULT_DURATION_HOURS = 6;

export type EventFormValues = {
  venueId: string | null;
  name: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  ages: AgeChip[];
  gender: GenderChip;
};

export type FormContext = { now: Date; timeZone: string };

export type EventFormErrorKey =
  | 'venueRequired'
  | 'nameRequired'
  | 'nameTooLong'
  | 'descriptionTooLong'
  | 'startInPast'
  | 'startTooFar'
  | 'endBeforeStart'
  | 'endAfterNight';
export type EventFormField = 'venue' | 'name' | 'description' | 'startsAt' | 'endsAt';
export type EventFormErrors = Partial<Record<EventFormField, EventFormErrorKey>>;

export type EventInput = {
  venueId: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  ageBands: string[];
  genders: string[];
};

export type EventFormResult =
  { ok: true; input: EventInput } | { ok: false; errors: EventFormErrors };

const FIELD_OF_PATH: Record<string, EventFormField> = {
  venueId: 'venue',
  name: 'name',
  description: 'description',
  startsAt: 'startsAt',
  endsAt: 'endsAt',
};

const baseSchema = z.object({
  venueId: z
    .string()
    .nullable()
    .refine((id) => id !== null && id.length > 0, 'venueRequired'),
  name: z.string().trim().min(1, 'nameRequired').max(NAME_MAX, 'nameTooLong'),
  description: z.string().trim().max(DESCRIPTION_MAX, 'descriptionTooLong'),
  startsAt: z.date(),
  endsAt: z.date(),
  ages: z.array(z.enum(['18-24', '25-34', '35+'])),
  gender: z.enum(['all', 'female', 'male']),
});

type Issue = { path: 'startsAt' | 'endsAt'; message: EventFormErrorKey };

// The same rules the server enforces in create_event/update_event (which stays the authority).
function scheduleIssue(startsAt: Date, endsAt: Date, { now, timeZone }: FormContext): Issue | null {
  if (startsAt <= now) return { path: 'startsAt', message: 'startInPast' };
  if (startsAt.getTime() > now.getTime() + MAX_DAYS_AHEAD * DAY_MS)
    return { path: 'startsAt', message: 'startTooFar' };
  if (endsAt <= startsAt) return { path: 'endsAt', message: 'endBeforeStart' };
  if (endsAt > nightEndOf(startsAt, timeZone)) return { path: 'endsAt', message: 'endAfterNight' };
  return null;
}

function toErrors(issues: readonly z.core.$ZodIssue[]): EventFormErrors {
  const errors: EventFormErrors = {};
  for (const issue of issues) {
    const field = FIELD_OF_PATH[String(issue.path[0])];
    if (field && !errors[field]) errors[field] = issue.message as EventFormErrorKey;
  }
  return errors;
}

export function validateEventForm(values: EventFormValues, context: FormContext): EventFormResult {
  const parsed = baseSchema.safeParse(values);
  const errors = parsed.success ? {} : toErrors(parsed.error.issues);
  const issue =
    errors.startsAt || errors.endsAt
      ? null
      : scheduleIssue(values.startsAt, values.endsAt, context);
  if (issue) errors[issue.path] = issue.message;
  if (!parsed.success || issue || Object.keys(errors).length > 0) return { ok: false, errors };

  const { ageBands, genders } = toTargetArrays(parsed.data.ages, parsed.data.gender);
  return {
    ok: true,
    input: {
      venueId: parsed.data.venueId as string,
      name: parsed.data.name,
      description: parsed.data.description === '' ? null : parsed.data.description,
      startsAt: parsed.data.startsAt.toISOString(),
      endsAt: parsed.data.endsAt.toISOString(),
      ageBands,
      genders,
    },
  };
}

// Six hours after the start, but never past the end of the night the event starts in.
export function defaultEnd(startsAt: Date, timeZone: string): Date {
  const sixHours = new Date(startsAt.getTime() + DEFAULT_DURATION_HOURS * HOUR_MS);
  const lastMoment = nightEndOf(startsAt, timeZone);
  return sixHours > lastMoment ? lastMoment : sixHours;
}

// 22:00 tonight, or tomorrow once tonight's slot is too close to start.
export function defaultStart(now: Date, timeZone: string): Date {
  const today = { ...wallTimeIn(now, timeZone), hour: DEFAULT_START_HOUR, minute: 0 };
  const tonight = instantFromWallTime(today, timeZone);
  if (tonight.getTime() - now.getTime() > HOUR_MS) return tonight;
  return instantFromWallTime(shiftWallTime(today, 24 * 60), timeZone);
}
