import * as Contacts from 'expo-contacts/legacy';

import { matchContacts, type Person } from './api';
import { sha256 } from './digest';
import { chunk } from './domain/batch';
import { hashPhone } from './domain/hash';
import { toE164 } from './domain/phone';

export const CONTACTS_BATCH_SIZE = 500;
const PAGE_SIZE = 500;

export type ContactsResult = { status: 'denied' } | { status: 'ok'; matches: Person[] };

// Names are never requested or read: only phone numbers, and only to be hashed on the device.
async function readPhoneNumbers(): Promise<string[]> {
  const numbers: string[] = [];
  for (let offset = 0, more = true; more; offset += PAGE_SIZE) {
    const page = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      pageSize: PAGE_SIZE,
      pageOffset: offset,
    });
    page.data.forEach((contact) =>
      contact.phoneNumbers?.forEach((phone) => phone.number && numbers.push(phone.number)),
    );
    more = page.hasNextPage;
  }
  return numbers;
}

async function uniqueHashes(rawNumbers: string[], defaultCountry: string): Promise<string[]> {
  const e164 = new Set(
    rawNumbers.map((raw) => toE164(raw, defaultCountry)).filter((n): n is string => n !== null),
  );
  return Promise.all([...e164].map((number) => hashPhone(number, sha256)));
}

async function matchInBatches(hashes: string[]): Promise<Person[]> {
  const found = new Map<string, Person>();
  for (const batch of chunk(hashes, CONTACTS_BATCH_SIZE)) {
    (await matchContacts(batch)).forEach((person) => found.set(person.userId, person));
  }
  return [...found.values()];
}

// Principle 4: permission is asked only here (button or toggle), and only SHA-256 hashes leave the phone.
export async function findFriendsFromContacts(options: {
  defaultCountry: string;
}): Promise<ContactsResult> {
  const permission = await Contacts.requestPermissionsAsync();
  if (!permission.granted) return { status: 'denied' };
  const hashes = await uniqueHashes(await readPhoneNumbers(), options.defaultCountry);
  if (hashes.length === 0) return { status: 'ok', matches: [] };
  return { status: 'ok', matches: await matchInBatches(hashes) };
}
