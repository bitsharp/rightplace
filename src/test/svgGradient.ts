type TreeNode = { type?: string; props: Record<string, unknown>; children: unknown[] };

// react-native-svg flattens a gradient to [offset, ARGB, offset, ARGB, ...]: decode it for the assertions.
export function gradientStops(root: unknown): { offset: number; hex: string; alpha: number }[][] {
  const gradients: { offset: number; hex: string; alpha: number }[][] = [];
  const walk = (node: unknown) => {
    if (typeof node === 'string' || !node) return;
    const { props, children } = node as TreeNode;
    if (Array.isArray(props.gradient)) {
      const flat = props.gradient as number[];
      const stops: { offset: number; hex: string; alpha: number }[] = [];
      for (let i = 0; i < flat.length; i += 2) {
        const argb = (flat[i + 1] ?? 0) >>> 0;
        const rgb = (argb & 0xffffff).toString(16).padStart(6, '0').toUpperCase();
        stops.push({ offset: flat[i] ?? 0, hex: `#${rgb}`, alpha: (argb >>> 24) / 255 });
      }
      gradients.push(stops);
    }
    children.forEach(walk);
  };
  walk(root);
  return gradients;
}
