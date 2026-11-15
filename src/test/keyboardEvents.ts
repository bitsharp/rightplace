import { Keyboard } from 'react-native';

type Listener = (event: unknown) => void;

// Jest's Keyboard is a stub with no emitter: capture the listeners the code registers and let
// tests fire the platform events (with an endCoordinates.height like the real ones).
export function mockKeyboardEvents() {
  const listeners = new Map<string, Set<Listener>>();
  jest.spyOn(Keyboard, 'addListener').mockImplementation(((event: string, listener: Listener) => {
    const set = listeners.get(event) ?? new Set<Listener>();
    set.add(listener);
    listeners.set(event, set);
    return { remove: () => set.delete(listener) };
  }) as unknown as typeof Keyboard.addListener);
  const emit = (event: string, height = 0) =>
    listeners.get(event)?.forEach((listener) => listener({ endCoordinates: { height } }));
  return { emit };
}
