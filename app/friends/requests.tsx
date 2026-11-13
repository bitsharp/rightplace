import { Redirect } from 'expo-router';

// rightplace://friends/requests (push and external links): the requests live in the Friends tab.
export default function FriendRequestsLink() {
  return <Redirect href="/friends" />;
}
