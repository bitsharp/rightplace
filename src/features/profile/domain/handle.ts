export function formatHandle(handle: string): string {
  return handle.startsWith('@') ? handle : `@${handle}`;
}
