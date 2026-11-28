// Hermes (the engine of the app on device) has no Intl.RelativeTimeFormat and does not support
// NumberFormat `style: 'unit'`; Node (jest) has both, so tests must simulate the device.
// The test environment swaps the global Intl while an app is rendered, hence the accessor that
// keeps patching whatever object gets assigned.
type IntlLike = typeof Intl;

function asHermes(real: IntlLike): IntlLike {
  const RealNumberFormat = real.NumberFormat;
  const Guarded = function (locales?: string | string[], options?: Intl.NumberFormatOptions) {
    if (options?.style === 'unit') throw new RangeError('Unsupported number format style: unit');
    return new RealNumberFormat(locales, options);
  } as unknown as typeof Intl.NumberFormat;
  return Object.create(real, {
    RelativeTimeFormat: { value: undefined },
    NumberFormat: { value: Guarded },
  }) as IntlLike;
}

export function simulateHermesIntl(): () => void {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'Intl');
  let current = asHermes(Intl);
  Object.defineProperty(globalThis, 'Intl', {
    configurable: true,
    get: () => current,
    set: (value: IntlLike) => {
      current = asHermes(value);
    },
  });
  return () => {
    if (original) Object.defineProperty(globalThis, 'Intl', original);
  };
}
