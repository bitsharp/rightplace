import { useRouter } from 'expo-router';

// Back to where the user came from; a deep link falls back to the creator profile.
export function useCreatorNavigation() {
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/creator'));
  return {
    goBack,
    openNewEvent: () => router.push('/creator/new-event'),
    openAttendance: (eventId: string) =>
      router.push({ pathname: '/creator/event/[id]', params: { id: eventId } }),
    openEdit: (eventId: string) =>
      router.push({ pathname: '/creator/edit-event/[id]', params: { id: eventId } }),
  };
}
