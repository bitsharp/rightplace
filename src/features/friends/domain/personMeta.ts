// "18-24" is stored with a hyphen; the UI shows the typographic en dash (as in the mock-up).
export function ageBandLabel(band: string): string {
  return band.replace('-', '–');
}
