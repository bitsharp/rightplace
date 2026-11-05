import { useState } from 'react';

import {
  activeMentionQuery,
  insertMention,
  suggestMentions,
  unknownMentions,
} from './domain/mentions';

type Selection = { start: number; end: number };

// Text, cursor and everything derived from them (mention suggestions, "Segui" chips).
// The cursor is unknown until the platform reports it; until then the end of the text is assumed.
export function useComposer(followingHandles: string[], myHandle: string) {
  const [text, setText] = useState('');
  const [cursor, setCursor] = useState<number | null>(null);
  const [forced, setForced] = useState<Selection | undefined>(undefined);

  const query = activeMentionQuery(text, cursor ?? text.length);
  const suggestions = query === null ? [] : suggestMentions(query, followingHandles);

  return {
    text,
    forcedSelection: forced,
    suggestions,
    unknown: unknownMentions(text, followingHandles, myHandle),
    changeText: (next: string) => {
      setText(next);
      setCursor(null);
    },
    changeSelection: (selection: Selection) => {
      setCursor(selection.start);
      setForced(undefined);
    },
    pickMention: (handle: string) => {
      const next = insertMention(text, cursor ?? text.length, handle);
      setText(next.text);
      setCursor(next.cursor);
      setForced({ start: next.cursor, end: next.cursor });
    },
    clear: () => {
      setText('');
      setCursor(null);
      setForced(undefined);
    },
  };
}
