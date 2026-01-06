'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useValidators } from '@/hooks/useValidators';
import { ContinentData, MapboxEvent } from '@/types/mapbox';
import { Globe, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MapRef, ViewState } from 'react-map-gl/mapbox';
import Map, { Layer, Marker, Source } from 'react-map-gl/mapbox';

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
  latency?: number;
  createdAt?: string; 
}

interface MapboxCountryData {
  name: string;
  code: string;
  validators: MapboxValidatorData[];
  onlineCount: number;
}

interface MapboxGlobeMapProps {
  monitorId?: string;
}


type ExtendedValidatorData = MapboxValidatorData & {
  validatorCount?: number;
  cities?: string[];
};


const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;


const AVAILABLE_AVATARS = Array.from({ length: 17 }, (_, i) => `/avatar-${i + 1}.png`);


function getValidatorAvatar(validatorId: string): string {
  
  let hash = 0;
  for (let i = 0; i < validatorId.length; i++) {
    hash = ((hash << 5) - hash + validatorId.charCodeAt(i)) & 0xffffffff;
  }
  const avatarIndex = Math.abs(hash) % AVAILABLE_AVATARS.length;
  return AVAILABLE_AVATARS[avatarIndex];
}

export function MapboxGlobeMap({}: MapboxGlobeMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [hoveredValidator, setHoveredValidator] = useState<ExtendedValidatorData | null>(null);
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

  
  const { data: validatorsData, isLoading, error } = useValidators();

  
  const validators: MapboxValidatorData[] = useMemo(() => {
    if (!validatorsData?.validators || validatorsData.validators.length === 0) {
      return [];
    }

    return validatorsData.validators.map(validator => ({
      id: validator.validatorId,
      country: validator.location.country,
      city: validator.location.city,
      lat: validator.location.latitude,
      lng: validator.location.longitude,
      status: 'online',
      countryCode: validator.location.countryCode,
      continent: validator.location.continent,
      continentCode: validator.location.continentCode,
      flag: validator.location.flag,
    }));
  }, [validatorsData]);

  
  const countryData: MapboxCountryData[] = useMemo(() => {
    if (!validators || validators.length === 0) {
      return [];
    }

    
    const countryMap = new (globalThis.Map)<string, MapboxValidatorData[]>();
    
    validators.forEach(validator => {
      const countryKey = validator.countryCode;
      if (!countryMap.has(countryKey)) {
        countryMap.set(countryKey, []);
      }
      countryMap.get(countryKey)!.push(validator);
    });

    
    return (Array.from(countryMap.entries()) as [string, MapboxValidatorData[]][]).map(([countryCode, countryValidators]) => ({
      name: countryCode, 
      code: countryCode,
      validators: countryValidators,
      onlineCount: countryValidators.length
    })).sort((a: MapboxCountryData, b: MapboxCountryData) => b.onlineCount - a.onlineCount);
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

  
  const continentData = useMemo(() => {
    const continentMap = new (globalThis.Map)<string, ContinentData>();
    
    validators.forEach(validator => {
      const continent = validator.continent;
      
      if (!continentMap.has(continent)) {
        continentMap.set(continent, {
          continent: continent,
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
    
    return Array.from(continentMap.values()).sort((a: ContinentData, b: ContinentData) => b.count - a.count);
  }, [validators]);

  
  const countriesWithValidators = useMemo(() => {
    
    return countryData.map(country => {
      
      return country.name.charAt(0).toUpperCase() + country.name.slice(1).toLowerCase();
    });
  }, [countryData]);

  
  const onMapClick = useCallback((event: MapboxEvent) => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    
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
      
      
      let countryInData = countryData.find((c: MapboxCountryData) => c.name.toLowerCase() === countryName?.toLowerCase());
      
      
      if (!countryInData && feature.properties?.iso_3166_1) {
        countryInData = countryData.find((c: MapboxCountryData) => c.code === feature.properties!.iso_3166_1);
      }
      
      if (countryInData) {
        setSelectedCountry(selectedCountry === countryName ? null : countryName);
      }
    }
  }, [countryData, selectedCountry, mapLoaded]);

  
  const onMapMouseMove = useCallback((event: MapboxEvent) => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;

    
    if (!map.getLayer('country-hover')) {
      return;
    }

    
    const countryFeatures = map.queryRenderedFeatures([event.point.x, event.point.y], {
      layers: ['country-hover']
    });

    if (countryFeatures.length > 0) {
      const feature = countryFeatures[0];
      
      
      const mapboxCountryName = feature.properties?.name_en || feature.properties?.NAME || feature.properties?.name;
      
      
      let countryInData = countryData.find(c => 
        c.name.toLowerCase() === mapboxCountryName?.toLowerCase()
      );
      
      
      if (!countryInData && feature.properties?.iso_3166_1) {
        const mapboxCountryCode = feature.properties.iso_3166_1;
        countryInData = countryData.find(c => 
          c.code === mapboxCountryCode
        );
      }
      
      if (countryInData) {
        
        
        setHoveredValidator({
          id: countryInData.code,
          country: countryInData.name,
          city: '', 
          lat: 0, lng: 0, 
          status: 'online',
          countryCode: countryInData.code,
          continent: countryInData.validators[0]?.continent || '',
          continentCode: countryInData.validators[0]?.continentCode || '',
          flag: countryInData.validators[0]?.flag || null,
          
          ...{
            validatorCount: countryInData.onlineCount,
            cities: countryInData.validators.map(v => v.city || 'Unknown City')
          }
        } as ExtendedValidatorData);
        setTooltipPosition({ x: event.point.x, y: event.point.y });
        setHoveredCountry(mapboxCountryName || null);
        map.getCanvas().style.cursor = 'pointer';
        return;
      }
    }

    
    setHoveredCountry(null);
    setHoveredValidator(null);
    setTooltipPosition(null);
    map.getCanvas().style.cursor = '';
  }, [countryData, mapLoaded]);

  
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

  
  const focusOnContinent = useCallback((continentName: string) => {
    const continentValidators = validators.filter(v => v.continent.toLowerCase() === continentName.toLowerCase());
    
    if (continentValidators.length > 0 && mapRef.current) {
      const map = mapRef.current.getMap();
      
      
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

  
  useEffect(() => {
    if (selectedCountryData && mapRef.current) {
      const map = mapRef.current.getMap();
      const countryValidators = selectedCountryData.validators;
      
      if (countryValidators.length > 0) {
        
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
        
            <Badge variant="outline">{stats.online} Online</Badge>
      
        </div>
      </div>
        <div className="space-y-6">
          
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
                        setSelectedCountry(null); 
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
                          alt={`Validator in ${validator.city || 'Unknown City'}, ${validator.country}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            
                            (e.target as HTMLImageElement).src = '/avatar-1.png';
                          }}
                        />
                      </div>
                      
                      
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-white rounded-full shadow-sm">
                        <div className="absolute inset-1 bg-green-400 rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </Marker>
                ))}
              </Map>

              
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
                    
                    <div className="border-b border-white/20 pb-3">
                      <h5 className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-2">Location</h5>
                      <div className="flex items-center gap-2 mb-1">
                        {selectedValidator.flag && (
                          <img src={selectedValidator.flag} alt="" className="w-5 h-3 rounded-sm" />
                        )}
                        <span className="font-medium">{selectedValidator.country}</span>
                      </div>
                      <div className="text-gray-300 text-sm">
                        📍 {selectedValidator.city || 'Unknown City'}
                      </div>
                      <div className="text-gray-400 text-xs mt-1">
                        🌍 {selectedValidator.continent}
                      </div>
                    </div>

                    
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

                    
                    {/* <div>
                      <h5 className="text-xs font-medium text-gray-300 uppercase tracking-wide mb-2">Coordinates</h5>
                      <div className="text-xs text-gray-400 font-mono">
                        <div>Lat: {selectedValidator.lat.toFixed(4)}°</div>
                        <div>Lng: {selectedValidator.lng.toFixed(4)}°</div>
                      </div>
                    </div> */}
                  </div>

                  
                  <button
                    onClick={() => setSelectedValidator(null)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-white text-lg"
                  >
                    ×
                  </button>
                </div>
              )}

              
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
                    <p>{selectedCountryData.onlineCount} online</p>
                  </div>
                  
                  <div className="border-t border-white/20 pt-2">
                    <p className="text-xs font-medium mb-1">Cities:</p>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {(() => {
                        const cityMap = new (globalThis.Map)<string, number>();
                        selectedCountryData.validators.forEach(v => {
                          const cityName = v.city || 'Unknown City';
                          cityMap.set(cityName, (cityMap.get(cityName) || 0) + 1);
                        });
                        return Array.from(cityMap.entries())
                          .sort((a: [string, number], b: [string, number]) => b[1] - a[1])
                          .slice(0, 8)
                          .map(([city, count]: [string, number]) => (
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

              
              {hoveredValidator && tooltipPosition && !selectedValidator && (
                <div 
                  className="absolute pointer-events-none bg-black/90 text-white p-3 rounded-md text-sm z-50 max-w-72"
                  style={{
                    left: tooltipPosition.x + 10,
                    top: tooltipPosition.y - 10,
                    transform: 'translateY(-100%)'
                  }}
                >
                  
                  {hoveredValidator.validatorCount ? (
                    
                    <>
                      <div className="font-semibold flex items-center gap-2 mb-2">
                        {hoveredValidator.flag && (
                          <img src={hoveredValidator.flag} alt="" className="w-5 h-3 rounded-sm" />
                        )}
                        {hoveredValidator.country}
                      </div>
                      <div className="space-y-2">
                        <div className="text-green-400 text-sm">
                          ● {hoveredValidator.validatorCount} Validator{(hoveredValidator.validatorCount || 0) > 1 ? 's' : ''} Online
                        </div>
                        {hoveredValidator.cities && hoveredValidator.cities.length > 0 && (
                          <div>
                            <div className="text-gray-300 text-xs mb-1">Cities:</div>
                            <div className="flex flex-wrap gap-1">
                              {[...(new Set(hoveredValidator.cities))].map((city: string, index: number) => (
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
                        <div className="text-gray-300">📍 {hoveredValidator.city || 'Unknown City'}</div>
                        <div className="text-gray-400 font-mono">{hoveredValidator.id.slice(0, 8)}...</div>
                      </div>
                    </>
                  )}
                </div>
              )}

            </div>

            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
              <div className="md:col-span-2 lg:col-span-3">
                <h3 className="text-lg font-semibold mb-3">Validator Distribution by Continent</h3>
              </div>
              {continentData.map((continent: ContinentData) => (
                <div 
                  key={continent.continent} 
                  className={`bg-background p-3 rounded-md cursor-pointer transition-all hover:shadow-md border-2 ${
                    selectedContinent === continent.continent ? 'border-primary' : 'border-transparent'
                  }`}
                  onClick={() => focusOnContinent(continent.continent)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{continent.continent}</span>
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