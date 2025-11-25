// Mapbox related types

/**
 * Continent data with validator count
 */
export interface ContinentData {
  continent: string;
  count: number;
  countries: string[];
}

/**
 * Mapbox map event with point coordinates
 */
export interface MapboxEvent {
  point: {
    x: number;
    y: number;
  };
  lngLat: {
    lng: number;
    lat: number;
  };
  target: unknown;
  type: string;
  originalEvent: MouseEvent;
}

/**
 * Mapbox feature from query results
 */
export interface MapboxFeature {
  id?: string | number;
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: string;
    coordinates: number[] | number[][] | number[][][];
  };
  layer?: {
    id: string;
    type: string;
  };
  source?: string;
  sourceLayer?: string;
  state?: Record<string, unknown>;
}

/**
 * Country feature properties from Mapbox data
 */
export interface CountryFeatureProperties {
  NAME?: string;
  NAME_EN?: string;
  ISO_A2?: string;
  ISO_A3?: string;
  [key: string]: unknown;
}