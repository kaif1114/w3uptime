'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useValidatorsByCountryAggregated } from '@/hooks/useValidators';
import { Validator } from '@/types/validator';
import { Globe, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef, ViewState } from 'react-map-gl/mapbox';
import Map, { Layer, Source } from 'react-map-gl/mapbox';

interface MapboxValidatorData {
  id: string;
  country: string;
  city: string;
  lat: number;
  lng: number;
  status: 'online';
  countryCode: string;
  continent: string;
  continentCode: string;
  flag: string | null;
}

interface MapboxCountryData {
  name: string;
  code: string;
  validators: MapboxValidatorData[];
  onlineCount: number;
}

interface MapboxGlobeMapProps {
  // Optional prop for backward compatibility with mock data
  mockValidators?: any[];
}


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Approximate coordinates for major cities and countries
// In production, you might want to use a geocoding service or store coordinates in the database
function getApproximateCoordinates(country: string, city: string): { lat: number; lng: number } {
  const cityCoords: Record<string, { lat: number; lng: number }> = {
    // Major cities coordinates
    'new york': { lat: 40.7128, lng: -74.0060 },
    'london': { lat: 51.5074, lng: -0.1278 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'paris': { lat: 48.8566, lng: 2.3522 },
    'berlin': { lat: 52.5200, lng: 13.4050 },
    'toronto': { lat: 43.6532, lng: -79.3832 },
    'singapore': { lat: 1.3521, lng: 103.8198 },
    'mumbai': { lat: 19.0760, lng: 72.8777 },
    'sao paulo': { lat: -23.5505, lng: -46.6333 },
  };

  // Country center coordinates as fallback
  const countryCoords: Record<string, { lat: number; lng: number }> = {
    'united states': { lat: 39.8283, lng: -98.5795 },
    'canada': { lat: 56.1304, lng: -106.3468 },
    'united kingdom': { lat: 55.3781, lng: -3.4360 },
    'germany': { lat: 51.1657, lng: 10.4515 },
    'france': { lat: 46.2276, lng: 2.2137 },
    'japan': { lat: 36.2048, lng: 138.2529 },
    'australia': { lat: -25.2744, lng: 133.7751 },
    'singapore': { lat: 1.3521, lng: 103.8198 },
    'india': { lat: 20.5937, lng: 78.9629 },
    'brazil': { lat: -14.2350, lng: -51.9253 },
  };

  const cityKey = city.toLowerCase();
  const countryKey = country.toLowerCase();

  // Try to find city coordinates first
  if (cityCoords[cityKey]) {
    return cityCoords[cityKey];
  }

  // Fallback to country coordinates
  if (countryCoords[countryKey]) {
    // Add small random offset to avoid overlapping markers
    return {
      lat: countryCoords[countryKey].lat + (Math.random() - 0.5) * 2,
      lng: countryCoords[countryKey].lng + (Math.random() - 0.5) * 2
    };
  }

  // Ultimate fallback - random location
  return {
    lat: (Math.random() - 0.5) * 180,
    lng: (Math.random() - 0.5) * 360
  };
}

export function MapboxGlobeMap({ mockValidators }: MapboxGlobeMapProps) {
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

  // Fetch real validator data from hub server
  const { data: validatorData, isLoading, error } = useValidatorsByCountryAggregated();

  // Transform real validator data to MapboxValidatorData format
  const validators: MapboxValidatorData[] = useMemo(() => {
    if (!validatorData || validatorData.length === 0) {
      // Fallback to mock data if provided
      if (mockValidators) {
        return mockValidators.map(v => ({
          id: v.id,
          country: v.country,
          city: v.city,
          lat: v.lat,
          lng: v.lng,
          status: 'online' as const,
          countryCode: v.country.substring(0, 2).toUpperCase(),
          continent: v.continent || 'Unknown',
          continentCode: v.continent?.substring(0, 2).toUpperCase() || 'UN',
          flag: null
        }));
      }
      return [];
    }

    // Transform real validator data
    const transformedValidators: MapboxValidatorData[] = [];
    
    validatorData.forEach(country => {
      country.validators.forEach(validator => {
        // For now, we'll use approximate coordinates based on country/city
        // In a real implementation, you might want to geocode or use stored coordinates
        const coords = getApproximateCoordinates(validator.location.country, validator.location.city);
        
        transformedValidators.push({
          id: validator.validatorId,
          country: validator.location.country,
          city: validator.location.city,
          lat: coords.lat,
          lng: coords.lng,
          status: 'online',
          countryCode: validator.location.countryCode,
          continent: validator.location.continent,
          continentCode: validator.location.continentCode,
          flag: validator.location.flag
        });
      });
    });
    
    return transformedValidators;
  }, [validatorData, mockValidators]);

  // Transform country data 
  const countryData: MapboxCountryData[] = useMemo(() => {
    if (!validatorData || validatorData.length === 0) {
      // Fallback logic for mock data
      if (mockValidators) {
        const countryMap = new Map<string, MapboxCountryData>();
        
        validators.forEach(validator => {
          const countryName = validator.country;
          if (!countryMap.has(countryName)) {
            countryMap.set(countryName, {
              name: countryName,
              code: validator.countryCode,
              validators: [],
              onlineCount: 0
            });
          }
          
          const country = countryMap.get(countryName)!;
          country.validators.push(validator);
          country.onlineCount++;
        });
        
        return Array.from(countryMap.values()).sort((a, b) => b.onlineCount - a.onlineCount);
      }
      return [];
    }

    return validatorData.map(country => ({
      name: country.name,
      code: country.code,
      validators: country.validators.map(validator => {
        const coords = getApproximateCoordinates(validator.location.country, validator.location.city);
        return {
          id: validator.validatorId,
          country: validator.location.country,
          city: validator.location.city,
          lat: coords.lat,
          lng: coords.lng,
          status: 'online' as const,
          countryCode: validator.location.countryCode,
          continent: validator.location.continent,
          continentCode: validator.location.continentCode,
          flag: validator.location.flag
        };
      }),
      onlineCount: country.count
    })).sort((a, b) => b.onlineCount - a.onlineCount);
  }, [validatorData, validators, mockValidators]);

  const stats = useMemo(() => {
    return { 
      online: validators.length, 
      total: validators.length, 
      countries: countryData.length 
    };
  }, [validators, countryData]);

  const selectedCountryData = useMemo(() => {
    return countryData.find((country: MapboxCountryData) => country.name === selectedCountry);
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
        const countryInData = countryData.find((c: MapboxCountryData) => c.name === countryName);
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
        const lngs = countryValidators.map((v: MapboxValidatorData) => v.lng);
        const lats = countryValidators.map((v: MapboxValidatorData) => v.lat);
        
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

  // Show loading state
  if (isLoading && !mockValidators) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Validator Network
            <Badge variant="outline">Loading...</Badge>
          </div>
        </div>
        <div className="h-screen rounded-lg border bg-muted animate-pulse flex items-center justify-center">
          <p className="text-muted-foreground">Loading validator network...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && !mockValidators) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Validator Network
            <Badge variant="destructive">Error</Badge>
          </div>
        </div>
        <div className="h-screen rounded-lg border bg-destructive/5 flex items-center justify-center">
          <p className="text-destructive">Failed to load validator network. Please try again.</p>
        </div>
      </div>
    );
  }

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
            {validatorData && (
              <Badge variant="secondary">Real-time</Badge>
            )}
            {mockValidators && !validatorData && (
              <Badge variant="outline">Demo</Badge>
            )}
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
                <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-sm max-w-72">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    {selectedCountryData.validators[0]?.flag && (
                      <img src={selectedCountryData.validators[0].flag} alt="" className="w-4 h-3 rounded-sm" />
                    )}
                    {selectedCountryData.name}
                  </h4>
                  <div className="space-y-1 text-xs mb-3">
                    <p>📍 {selectedCountryData.validators.length} validators</p>
                    <p>✅ {selectedCountryData.onlineCount} online</p>
                  </div>
                  {/* City breakdown */}
                  <div className="border-t border-white/20 pt-2">
                    <p className="text-xs font-medium mb-1">Cities:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {(() => {
                        const cityMap = new Map<string, number>();
                        selectedCountryData.validators.forEach(v => {
                          const cityName = v.city;
                          cityMap.set(cityName, (cityMap.get(cityName) || 0) + 1);
                        });
                        return Array.from(cityMap.entries())
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 8)
                          .map(([city, count]) => (
                            <div key={city} className="flex justify-between text-xs">
                              <span>{city}</span>
                              <span className="text-green-400">{count}</span>
                            </div>
                          ));
                      })()}
                    </div>
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