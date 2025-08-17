'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Globe, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef, ViewState } from 'react-map-gl/mapbox';
import Map, { Layer, Source } from 'react-map-gl/mapbox';

interface ValidatorData {
  id: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  latency: number;
  status: 'online' | 'offline' | 'moderate' | 'good';
  lastChecked: Date;
  ip: string;
}

interface CountryData {
  name: string;
  code: string;
  validators: ValidatorData[];
  avgLatency: number;
  onlineCount: number;
}

interface MapboxGlobeMapProps {
  validators: ValidatorData[];
}


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

export function MapboxGlobeMap({ validators }: MapboxGlobeMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 0,
    latitude: 20,
    zoom: 1.5,
    bearing: 0,
    pitch: 0,
    padding: {
      top: 100,
      left: 100,
      bottom: 100,
      right: 100
    }
  });

  // Group validators by country
  const countryData = useMemo(() => {
    const countryMap = new globalThis.Map<string, CountryData>();
    
    validators.forEach(validator => {
      const countryName = validator.country;
      if (!countryMap.has(countryName)) {
        countryMap.set(countryName, {
          name: countryName,
          code: countryName.substring(0, 2).toUpperCase(),
          validators: [],
          avgLatency: 0,
          onlineCount: 0
        });
      }
      
      const country = countryMap.get(countryName)!;
      country.validators.push(validator);
      
      if (validator.status !== 'offline') {
        country.onlineCount++;
      }
    });

    // Calculate average latency for each country
    countryMap.forEach((country: CountryData) => {
      const totalLatency = country.validators.reduce((sum: number, v: ValidatorData) => sum + v.latency, 0);
      country.avgLatency = Math.round(totalLatency / country.validators.length);
    });

    return Array.from(countryMap.values()).sort((a: CountryData, b: CountryData) => b.onlineCount - a.onlineCount);
  }, [validators]);

  const stats = useMemo(() => {
    const online = validators.filter(v => v.status !== 'offline').length;
    const avgLatency = validators.reduce((sum, v) => sum + v.latency, 0) / validators.length;
    
    return { 
      online, 
      total: validators.length, 
      avgLatency: Math.round(avgLatency), 
      countries: countryData.length 
    };
  }, [validators, countryData]);

  const selectedCountryData = useMemo(() => {
    return countryData.find((country: CountryData) => country.name === selectedCountry);
  }, [countryData, selectedCountry]);

  // Create GeoJSON for validator points
  const validatorGeoJSON = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: validators.map(validator => ({
        type: 'Feature' as const,
        properties: {
          id: validator.id,
          country: validator.country,
          city: validator.city,
          status: validator.status,
          latency: validator.latency
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [validator.lng, validator.lat]
        }
      }))
    };
  }, [validators]);

  // Handle map click events
  const onMapClick = useCallback((event: any) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = map.queryRenderedFeatures([event.point.x, event.point.y], {
      layers: ['country-fills']
    });

    if (features.length > 0) {
      const countryName = features[0].properties?.NAME;
      if (countryName) {
        const countryInData = countryData.find((c: CountryData) => c.name === countryName);
        if (countryInData) {
          setSelectedCountry(selectedCountry === countryName ? null : countryName);
        }
      }
    }
  }, [countryData, selectedCountry]);

  // Handle map hover events
  const onMapMouseMove = useCallback((event: any) => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    const features = map.queryRenderedFeatures([event.point.x, event.point.y], {
      layers: ['country-fills']
    });

    if (features.length > 0) {
      const countryName = features[0].properties?.NAME;
      setHoveredCountry(countryName || null);
      map.getCanvas().style.cursor = 'pointer';
    } else {
      setHoveredCountry(null);
      map.getCanvas().style.cursor = '';
    }
  }, []);

  // Map control functions
  const toggleGlobeView = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;

    try {
      const currentProjection = map.getProjection();
      const newProjection = currentProjection?.name === 'globe' ? 'mercator' : 'globe';
      map.setProjection(newProjection);
    } catch (error) {
      console.warn('Projection toggle not supported:', error);
    }
  }, []);

  const zoomIn = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.zoomIn();
  }, []);

  const zoomOut = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    map.zoomOut();
  }, []);

  const resetView = useCallback(() => {
    setViewState({
      longitude: 0,
      latitude: 20,
      zoom: 1.5,
      bearing: 0,
      pitch: 0,
      padding: {
        top: 0,
        left: 0,
        bottom: 0,
        right: 0
      }
    });
  }, []);

  // Focus on selected country
  useEffect(() => {
    if (selectedCountryData && mapRef.current) {
      const map = mapRef.current.getMap();
      const countryValidators = selectedCountryData.validators;
      
      if (countryValidators.length > 0) {
        // Calculate bounds for the country
        const lngs = countryValidators.map((v: ValidatorData) => v.lng);
        const lats = countryValidators.map((v: ValidatorData) => v.lat);
        
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        
        map.fitBounds(
          [[minLng, minLat], [maxLng, maxLat]],
          { padding: 100, duration: 1000 }
        );
      }
    }
  }, [selectedCountryData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Validator Network
          </span>
          <div className="flex gap-2">
            <Badge variant="outline">{stats.online} Online</Badge>
          </div>
        </div>
      </div>
        <div className="space-y-6">
          {/* Mapbox 3D Globe */}
          <div className="space-y-4">
            <div className="h-screen rounded-lg overflow-hidden relative border">
                             <Map
                 ref={mapRef}
                 {...viewState}
                 onMove={evt => setViewState(evt.viewState)}
                 onClick={onMapClick}
                 onMouseMove={onMapMouseMove}
                 mapboxAccessToken={MAPBOX_TOKEN}
                 style={{ width: '100%', height: '100%' }}
                 mapStyle="mapbox://styles/mapbox/standard"
                 projection="globe"
                 maxZoom={3}
                 minZoom={1}
                 fog={{
                   "color": "#220b30",
                   "high-color": "#245cdf", 
                   "horizon-blend": 0.02,
                   "space-color": "#000b19",
                   "star-intensity": 0.15
                 }}
               >
                {/* Validator Points */}
                <Source
                  id="validators"
                  type="geojson"
                  data={validatorGeoJSON}
                >
                  <Layer
                    id="validator-points"
                    type="circle"
                    paint={{
                      'circle-radius': [
                        'case',
                        ['==', ['get', 'status'], 'good'], 8,
                        ['==', ['get', 'status'], 'moderate'], 6,
                        ['==', ['get', 'status'], 'offline'], 4,
                        5
                      ],
                      'circle-color': [
                        'case',
                        ['==', ['get', 'status'], 'good'], '#10b981',
                        ['==', ['get', 'status'], 'moderate'], '#f59e0b',
                        ['==', ['get', 'status'], 'offline'], '#ef4444',
                        '#6b7280'
                      ],
                      'circle-stroke-color': '#ffffff',
                      'circle-stroke-width': 2,
                      'circle-opacity': 0.8
                    }}
                  />
                </Source>

                {/* Country Boundaries with highlighting */}
                <Source
                  id="countries"
                  type="vector"
                  url="mapbox://mapbox.country-boundaries-v1"
                >
                  <Layer
                    id="country-fills"
                    type="fill"
                    source-layer="country_boundaries"
                    paint={{
                      'fill-color': [
                        'case',
                        ['==', ['get', 'NAME'], selectedCountry || ''], '#3b82f6',
                        ['==', ['get', 'NAME'], hoveredCountry || ''], '#10b981',
                        'transparent'
                      ],
                      'fill-opacity': [
                        'case',
                        ['==', ['get', 'NAME'], selectedCountry || ''], 0.6,
                        ['==', ['get', 'NAME'], hoveredCountry || ''], 0.4,
                        0
                      ]
                    }}
                  />
                  <Layer
                    id="country-borders"
                    type="line"
                    source-layer="country_boundaries"
                    paint={{
                      'line-color': '#ffffff',
                      'line-width': 1,
                      'line-opacity': 0.5
                    }}
                  />
                </Source>
              </Map>

              {/* Map Controls */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={toggleGlobeView}
                  className="bg-black/70 text-white border-white/20 hover:bg-black/80"
                >
                  <Globe className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={zoomIn}
                  className="bg-black/70 text-white border-white/20 hover:bg-black/80"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={zoomOut}
                  className="bg-black/70 text-white border-white/20 hover:bg-black/80"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={resetView}
                  className="bg-black/70 text-white border-white/20 hover:bg-black/80"
                >
                  <RotateCw className="h-4 w-4" />
                </Button>
              </div>

              {/* Selected country info overlay */}
              {selectedCountryData && (
                <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-sm max-w-48">
                  <h4 className="font-semibold mb-2">{selectedCountryData.name}</h4>
                  <div className="space-y-1 text-xs">
                    <p>📍 {selectedCountryData.validators.length} validators</p>
                    <p>✅ {selectedCountryData.onlineCount} online</p>
                    <p>⚡ {selectedCountryData.avgLatency}ms avg</p>
                  </div>
                </div>
              )}

            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-sm">Good (&lt;100ms)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <span className="text-sm">Moderate (100-300ms)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <span className="text-sm">Poor (&gt;300ms)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gray-500"></div>
                <span className="text-sm">Offline</span>
              </div>
            </div>
          </div>

          {/* Country Details Panel */}
         
        </div>
      </div>
  );
}