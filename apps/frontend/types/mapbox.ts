


export interface ContinentData {
  continent: string;
  count: number;
  countries: string[];
}


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


export interface CountryFeatureProperties {
  NAME?: string;
  NAME_EN?: string;
  ISO_A2?: string;
  ISO_A3?: string;
  [key: string]: unknown;
}