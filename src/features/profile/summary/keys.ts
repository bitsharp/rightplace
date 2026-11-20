export const PROFILE_SUMMARY_ROOT_KEY = ['profileSummary'] as const;
export const profileSummaryKey = (userId: string) => [...PROFILE_SUMMARY_ROOT_KEY, userId] as const;
