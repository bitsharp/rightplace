export type CityCenter = { lat: number; lng: number; defaultZoom: number };

export type MapRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

// A web-mercator tile of 256 px spans 360 / 2^zoom degrees; a phone is about 1.5 tiles wide.
const SCREEN_WIDTH_IN_TILES = 1.5;
const LATITUDE_PER_LONGITUDE = 0.8;

export function cityRegion({ lat, lng, defaultZoom }: CityCenter): MapRegion {
  const longitudeDelta = (360 / 2 ** defaultZoom) * SCREEN_WIDTH_IN_TILES;
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: longitudeDelta * LATITUDE_PER_LONGITUDE,
    longitudeDelta,
  };
}
