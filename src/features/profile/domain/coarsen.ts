export type LatLng = { lat: number; lng: number };

// Same 0.005° grid as SQL coarsen() (principle 3): integer micro-degrees avoid float drift at cell edges.
const CELL_MICRO = 5000;

function snap(value: number): number {
  const micro = Math.round(value * 1_000_000);
  const cell = Math.floor(micro / CELL_MICRO);
  return (cell * CELL_MICRO + CELL_MICRO / 2) / 1_000_000;
}

export function coarsen({ lat, lng }: LatLng): LatLng {
  return { lat: snap(lat), lng: snap(lng) };
}
