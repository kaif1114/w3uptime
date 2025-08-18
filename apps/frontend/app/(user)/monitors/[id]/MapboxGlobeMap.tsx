'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMonitorTicks } from '@/hooks/useMonitors';
import { Globe, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef, ViewState } from 'react-map-gl/mapbox';
import Map, { Layer, Source, Marker } from 'react-map-gl/mapbox';

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
  latency?: number; // Optional latency for compatibility
}

interface MapboxCountryData {
  name: string;
  code: string;
  validators: MapboxValidatorData[];
  onlineCount: number;
}

interface MapboxGlobeMapProps {
  monitorId: string;
}


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// Available avatars (17 avatars available)
const AVAILABLE_AVATARS = Array.from({ length: 17 }, (_, i) => `/avatar-${i + 1}.png`);

// Function to assign avatar to validator based on their ID
function getValidatorAvatar(validatorId: string): string {
  // Create a simple hash from the validator ID to ensure consistent avatar assignment
  let hash = 0;
  for (let i = 0; i < validatorId.length; i++) {
    hash = ((hash << 5) - hash + validatorId.charCodeAt(i)) & 0xffffffff;
  }
  const avatarIndex = Math.abs(hash) % AVAILABLE_AVATARS.length;
  return AVAILABLE_AVATARS[avatarIndex];
}

export function MapboxGlobeMap({ monitorId }: MapboxGlobeMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredValidator, setHoveredValidator] = useState<MapboxValidatorData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedContinent, setSelectedContinent] = useState<string | null>(null);
  const [selectedValidator, setSelectedValidator] = useState<MapboxValidatorData | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
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

  // Fetch real monitor ticks data for this specific monitor
  const { data: ticksData, isLoading, error } = useMonitorTicks(monitorId, { limit: 500 });

  // Transform monitor ticks data to MapboxValidatorData format
  const validators: MapboxValidatorData[] = useMemo(() => {
    if (!ticksData?.ticks || ticksData.ticks.length === 0) {
      return [];
    }

    // Group ticks by validator ID to get unique validators with latest data
    const validatorMap = new Map<string, MapboxValidatorData>();
    
    ticksData.ticks.forEach(tick => {
      const existingValidator = validatorMap.get(tick.validator.id);
      if (!existingValidator || new Date(tick.createdAt) > new Date(existingValidator.id)) {
        validatorMap.set(tick.validator.id, {
          id: tick.validator.id,
          country: tick.location.countryCode,
          city: tick.location.city,
          lat: tick.location.latitude,
          lng: tick.location.longitude,
          status: 'online',
          countryCode: tick.location.countryCode,
          continent: tick.location.continentCode,
          continentCode: tick.location.continentCode,
          flag: null, // No flag data available in monitor ticks
          latency: tick.latency
        });
      }
    });
    
    return Array.from(validatorMap.values());
  }, [ticksData]);

  // Transform country data based on validators
  const countryData: MapboxCountryData[] = useMemo(() => {
    if (!validators || validators.length === 0) {
      return [];
    }

    // Group validators by country
    const countryMap = new Map<string, MapboxValidatorData[]>();
    
    validators.forEach(validator => {
      const countryKey = validator.countryCode;
      if (!countryMap.has(countryKey)) {
        countryMap.set(countryKey, []);
      }
      countryMap.get(countryKey)!.push(validator);
    });

    // Convert to country data format
    return Array.from(countryMap.entries()).map(([countryCode, countryValidators]) => ({
      name: countryCode, // Use country code as name since we don't have full country names
      code: countryCode,
      validators: countryValidators,
      onlineCount: countryValidators.length
    })).sort((a, b) => b.onlineCount - a.onlineCount);
  }, [validators]);

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

  // Aggregate data by continent
  const continentData = useMemo(() => {
    const continentMap = new globalThis.Map<string, { name: string; code: string; count: number; countries: string[] }>();
    
    validators.forEach(validator => {
      const continent = validator.continent;
      const continentCode = validator.continentCode;
      
      if (!continentMap.has(continent)) {
        continentMap.set(continent, {
          name: continent,
          code: continentCode,
          count: 0,
          countries: []
        });
      }
      
      const cont = continentMap.get(continent)!;
      cont.count++;
      
      if (!cont.countries.includes(validator.country)) {
        cont.countries.push(validator.country);
      }
    });
    
    return Array.from(continentMap.values()).sort((a, b) => b.count - a.count);
  }, [validators]);

  // Simple list of countries with validators for highlighting
  const countriesWithValidators = useMemo(() => {
    // Map lowercase validator country names to title case for Mapbox matching
    return countryData.map(country => {
      // Convert "pakistan" to "Pakistan" for Mapbox NAME property
      return country.name.charAt(0).toUpperCase() + country.name.slice(1).toLowerCase();
    });
  }, [countryData]);

  // Handle map click events
  const onMapClick = useCallback((event: any) => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    // Check if the country-hover layer exists before querying
    if (!map.getLayer('country-hover')) {
      console.warn('country-hover layer not found, skipping click handling');
      return;
    }

    const features = map.queryRenderedFeatures([event.point.x, event.point.y], {
      layers: ['country-hover']
    });

    if (features.length > 0) {
      const feature = features[0];
      const countryName = feature.properties?.name_en || feature.properties?.NAME || feature.properties?.name;
      
      // Try matching by name first
      let countryInData = countryData.find((c: MapboxCountryData) => c.name.toLowerCase() === countryName?.toLowerCase());
      
      // If no match by name, try country code
      if (!countryInData && feature.properties?.iso_3166_1) {
        countryInData = countryData.find((c: MapboxCountryData) => c.code === feature.properties!.iso_3166_1);
      }
      
      if (countryInData) {
        setSelectedCountry(selectedCountry === countryName ? null : countryName);
      }
    }
  }, [countryData, selectedCountry, mapLoaded]);

  // Handle map hover events
  const onMapMouseMove = useCallback((event: any) => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    // Check if the country-hover layer exists before querying
    if (!map.getLayer('country-hover')) {
      return;
    }

    // Query specifically our country layer
    const countryFeatures = map.queryRenderedFeatures([event.point.x, event.point.y], {
      layers: ['country-hover']
    });

    if (countryFeatures.length > 0) {
      const feature = countryFeatures[0];
      
      // Use English name from Mapbox properties (more reliable than bilingual names)
      const mapboxCountryName = feature.properties?.name_en || feature.properties?.NAME || feature.properties?.name;
      
      // Try matching by English name first
      let countryInData = countryData.find(c => 
        c.name.toLowerCase() === mapboxCountryName?.toLowerCase()
      );
      
      // If no match by name, try country code matching if available
      if (!countryInData && feature.properties?.iso_3166_1) {
        const mapboxCountryCode = feature.properties.iso_3166_1;
        countryInData = countryData.find(c => 
          c.code === mapboxCountryCode
        );
      }
      
      if (countryInData) {
        
        // Show tooltip with country validator information
        setHoveredValidator({
          id: countryInData.code,
          country: countryInData.name,
          city: '', // Not used
          lat: 0, lng: 0, // Not used
          status: 'online',
          countryCode: countryInData.code,
          continent: countryInData.validators[0]?.continent || '',
          continentCode: countryInData.validators[0]?.continentCode || '',
          flag: countryInData.validators[0]?.flag || null,
          validatorCount: countryInData.onlineCount,
          cities: countryInData.validators.map(v => v.city)
        } as any);
        setTooltipPosition({ x: event.point.x, y: event.point.y });
        setHoveredCountry(mapboxCountryName || null);
        map.getCanvas().style.cursor = 'pointer';
        return;
      }
    }

    // Clear all hover states
    setHoveredCountry(null);
    setHoveredValidator(null);
    setTooltipPosition(null);
    map.getCanvas().style.cursor = '';
  }, [countryData, mapLoaded]);

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
    setSelectedCountry(null);
    setSelectedContinent(null);
    setSelectedValidator(null);
  }, []);

  // Focus on continent
  const focusOnContinent = useCallback((continentName: string) => {
    const continentValidators = validators.filter(v => v.continent.toLowerCase() === continentName.toLowerCase());
    
    if (continentValidators.length > 0 && mapRef.current) {
      const map = mapRef.current.getMap();
      
      // Calculate bounds for the continent
      const lngs = continentValidators.map(v => v.lng);
      const lats = continentValidators.map(v => v.lat);
      
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      
      map.fitBounds(
        [[minLng, minLat], [maxLng, maxLat]],
        { padding: 50, duration: 1000 }
      );
      
      setSelectedContinent(continentName);
      setSelectedCountry(null);
    }
  }, [validators]);

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
  if (isLoading) {
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
  if (error) {
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

  // Show empty state when no validators
  if (!validators || validators.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Validator Network
            <Badge variant="outline">No Validators</Badge>
          </div>
        </div>
        <div className="h-screen rounded-lg border bg-muted/30 flex items-center justify-center">
          <div className="text-center">
            <Globe className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Validators Available</h3>
            <p className="text-muted-foreground max-w-md">
              There are currently no active validators in the network. The 3D world map will appear once validators come online.
            </p>
          </div>
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
            <Badge variant="secondary">Real-time</Badge>
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
                 onLoad={() => setMapLoaded(true)}
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
                {/* Add country boundaries for hover detection */}
                <Source
                  id="countries"
                  type="vector"
                  url="mapbox://mapbox.country-boundaries-v1"
                >
                  <Layer
                    id="country-hover"
                    type="fill"
                    source-layer="country_boundaries"
                    paint={{
                      'fill-color': [
                        'case',
                        ['==', ['get', 'name_en'], hoveredCountry || ''], '#10b981',
                        ['in', ['get', 'name_en'], ['literal', countriesWithValidators]], '#10b981',
                        'transparent'
                      ],
                      'fill-opacity': [
                        'case',
                        ['==', ['get', 'name_en'], hoveredCountry || ''], 0.4,
                        ['in', ['get', 'name_en'], ['literal', countriesWithValidators]], 0.2,
                        0
                      ]
                    }}
                  />
                </Source>

                {/* Avatar markers for individual validators */}
                {validators.map((validator) => (
                  <Marker
                    key={validator.id}
                    longitude={validator.lng}
                    latitude={validator.lat}
                    anchor="center"
                  >
                    <div
                      className={`relative cursor-pointer transform transition-all duration-300 hover:scale-110 ${
                        selectedValidator?.id === validator.id 
                          ? 'scale-125 z-50' 
                          : 'hover:z-40'
                      } drop-shadow-lg hover:drop-shadow-xl`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedValidator(
                          selectedValidator?.id === validator.id ? null : validator
                        );
                        setSelectedCountry(null); // Clear country selection when selecting validator
                      }}
                      onMouseEnter={(e) => {
                        setHoveredValidator(validator);
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltipPosition({ 
                          x: rect.left + rect.width / 2, 
                          y: rect.top 
                        });
                      }}
                      onMouseLeave={() => {
                        setHoveredValidator(null);
                        setTooltipPosition(null);
                      }}
                    >
                      <div 
                        className={`w-10 h-10 rounded-full border-3 overflow-hidden shadow-xl ${
                          selectedValidator?.id === validator.id
                            ? 'border-blue-400 shadow-blue-400/60 ring-2 ring-blue-300/50'
                            : 'border-white shadow-black/40 hover:border-gray-200'
                        } bg-white relative`}
                        style={{
                          background: selectedValidator?.id === validator.id 
                            ? 'linear-gradient(135deg, #60a5fa, #3b82f6)' 
                            : 'white',
                          backdropFilter: 'blur(4px)'
                        }}
                      >
                        <img
                          src={getValidatorAvatar(validator.id)}
                          alt={`Validator in ${validator.city}, ${validator.country}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Fallback to a default avatar if image fails to load
                            (e.target as HTMLImageElement).src = '/avatar-1.png';
                          }}
                        />
                      </div>
                      
                      {/* Online status indicator */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm">
                        <div className="absolute inset-1 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </Marker>
                ))}
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

              {/* Selected validator info overlay */}
              {selectedValidator && (
                <div className="absolute top-4 right-4 bg-black/80 text-white p-4 rounded-lg text-sm max-w-80">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full border-2 border-blue-400 overflow-hidden">
                      <img
                        src={getValidatorAvatar(selectedValidator.id)}
                        alt={`Validator avatar`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <h4 className="font-semibold text-base">Validator Details</h4>
                      <div className="text-green-400 text-sm flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        Online
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    {/* Location Information */}
                    <div className="border-b border-white/20 pb-3">
                      <h5 className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-2">Location</h5>
                      <div className="flex items-center gap-2 mb-1">
                        {selectedValidator.flag && (
                          <img src={selectedValidator.flag} alt="" className="w-5 h-3 rounded-sm" />
                        )}
                        <span className="font-medium">{selectedValidator.country}</span>
                      </div>
                      <div className="text-gray-300 text-sm">
                        📍 {selectedValidator.city}
                      </div>
                      <div className="text-gray-400 text-xs mt-1">
                        🌍 {selectedValidator.continent}
                      </div>
                    </div>

                    {/* Technical Details */}
                    <div className="border-b border-white/20 pb-3">
                      <h5 className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-2">Technical Info</h5>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-300">Validator ID:</span>
                          <span className="font-mono text-xs">{selectedValidator.id.slice(0, 8)}...</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Status:</span>
                          <span className="text-green-400">Active</span>
                        </div>
                        {selectedValidator.latency && (
                          <div className="flex justify-between">
                            <span className="text-gray-300">Latency:</span>
                            <span>{selectedValidator.latency}ms</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Coordinates */}
                    <div>
                      <h5 className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-2">Coordinates</h5>
                      <div className="text-xs text-gray-400 font-mono">
                        <div>Lat: {selectedValidator.lat.toFixed(4)}°</div>
                        <div>Lng: {selectedValidator.lng.toFixed(4)}°</div>
                      </div>
                    </div>
                  </div>

                  {/* Close button */}
                  <button
                    onClick={() => setSelectedValidator(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-white text-lg"
                  >
                    ×
                  </button>
                </div>
              )}

              {/* Selected country info overlay */}
              {selectedCountryData && !selectedValidator && (
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
                        const cityMap = new globalThis.Map<string, number>();
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

              {/* Validator/Country tooltip on hover */}
              {hoveredValidator && tooltipPosition && !selectedValidator && (
                <div 
                  className="absolute pointer-events-none bg-black/90 text-white p-3 rounded-md text-sm z-50 max-w-72"
                  style={{
                    left: tooltipPosition.x + 10,
                    top: tooltipPosition.y - 10,
                    transform: 'translateY(-100%)'
                  }}
                >
                  {/* Check if this is an individual validator tooltip or country tooltip */}
                  {(hoveredValidator as any).validatorCount ? (
                    // Country tooltip (aggregated data)
                    <>
                      <div className="font-semibold flex items-center gap-2 mb-2">
                        {hoveredValidator.flag && (
                          <img src={hoveredValidator.flag} alt="" className="w-5 h-3 rounded-sm" />
                        )}
                        {hoveredValidator.country}
                      </div>
                      <div className="space-y-2">
                        <div className="text-green-400 text-sm">
                          ● {(hoveredValidator as any).validatorCount} Validator{(hoveredValidator as any).validatorCount > 1 ? 's' : ''} Online
                        </div>
                        {(hoveredValidator as any).cities && (hoveredValidator as any).cities.length > 0 && (
                          <div>
                            <div className="text-gray-300 text-xs mb-1">Cities:</div>
                            <div className="flex flex-wrap gap-1">
                              {[...(new Set((hoveredValidator as any).cities as string[]))].map((city: string, index: number) => (
                                <span key={`${city}-${index}`} className="bg-gray-700 px-2 py-1 rounded text-xs">
                                  {city.charAt(0).toUpperCase() + city.slice(1)}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    // Individual validator tooltip
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full overflow-hidden border border-white/30">
                          <img
                            src={getValidatorAvatar(hoveredValidator.id)}
                            alt="Validator avatar"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-semibold text-sm">Validator</div>
                          <div className="text-green-400 text-xs flex items-center gap-1">
                            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                            Online
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex items-center gap-2">
                          {hoveredValidator.flag && (
                            <img src={hoveredValidator.flag} alt="" className="w-4 h-2.5 rounded-sm" />
                          )}
                          <span className="font-medium">{hoveredValidator.country}</span>
                        </div>
                        <div className="text-gray-300">📍 {hoveredValidator.city}</div>
                        <div className="text-gray-400 font-mono">{hoveredValidator.id.slice(0, 8)}...</div>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>

            {/* Continental Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-lg font-semibold mb-3">Validator Distribution by Continent</h3>
              </div>
              {continentData.map(continent => (
                <div 
                  key={continent.name} 
                  className={`bg-background p-3 rounded-md cursor-pointer transition-all hover:shadow-md border-2 ${
                    selectedContinent === continent.name ? 'border-primary' : 'border-transparent'
                  }`}
                  onClick={() => focusOnContinent(continent.name)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{continent.name}</span>
                    <Badge variant="secondary">{continent.count}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">
                    {continent.countries.length} countries
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {continent.countries.slice(0, 3).join(', ')}
                    {continent.countries.length > 3 && ` +${continent.countries.length - 3} more`}
                  </div>
                </div>
              ))}
            </div>

            {/* Status Legend */}
            <div className="grid grid-cols-1 gap-4 p-4 bg-muted rounded-lg">
              <div>
                <h4 className="font-medium mb-2">Legend</h4>
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm">Online Validators</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm">Selected Country</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500/40"></div>
                    <span className="text-sm">Hovered Country</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}