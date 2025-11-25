'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Users, Globe, Activity } from 'lucide-react';

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

interface GlobalValidatorMapProps {
  validators: ValidatorData[];
}

export function GlobalValidatorMap({ validators }: GlobalValidatorMapProps) {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  
  const countryData = useMemo(() => {
    const countryMap = new Map<string, CountryData>();
    
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

    
    countryMap.forEach(country => {
      const totalLatency = country.validators.reduce((sum, v) => sum + v.latency, 0);
      country.avgLatency = Math.round(totalLatency / country.validators.length);
    });

    return Array.from(countryMap.values()).sort((a, b) => b.onlineCount - a.onlineCount);
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
    return countryData.find(country => country.name === selectedCountry);
  }, [countryData, selectedCountry]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Global Validator Network
          </span>
          <div className="flex gap-2">
            <Badge variant="outline">{stats.online}/{stats.total} Online</Badge>
            <Badge variant="outline">{stats.countries} Countries</Badge>
            <Badge variant="outline">{stats.avgLatency}ms Avg</Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          <div className="lg:col-span-2 space-y-4">
            
            <div className="h-96 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 rounded-lg overflow-hidden relative">
              
              <div className="absolute inset-0 bg-gradient-to-r from-green-800/20 via-yellow-800/20 to-green-800/20"></div>
              
              
              <svg
                viewBox="0 0 1000 500"
                className="w-full h-full"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.1))' }}
              >
                
                <defs>
                  <linearGradient id="oceanGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#1e3a8a', stopOpacity:0.8}} />
                    <stop offset="50%" style={{stopColor:'#3b82f6', stopOpacity:0.6}} />
                    <stop offset="100%" style={{stopColor:'#1e40af', stopOpacity:0.8}} />
                  </linearGradient>
                  <linearGradient id="landGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{stopColor:'#065f46', stopOpacity:0.3}} />
                    <stop offset="100%" style={{stopColor:'#047857', stopOpacity:0.2}} />
                  </linearGradient>
                </defs>

                
                <rect width="1000" height="500" fill="url(#oceanGradient)" />

                
                
                <path d="M50 80 Q120 60 180 80 Q220 100 250 120 Q280 140 300 180 Q320 220 290 250 Q250 270 200 260 Q150 250 100 220 Q50 180 50 120 Z" 
                      fill="url(#landGradient)" stroke="#10b981" strokeWidth="1" opacity="0.4"/>
                
                
                <path d="M250 280 Q270 300 280 340 Q290 380 280 420 Q270 460 250 480 Q230 470 220 440 Q210 400 220 360 Q230 320 240 300 Z" 
                      fill="url(#landGradient)" stroke="#10b981" strokeWidth="1" opacity="0.4"/>
                
                
                <path d="M420 80 Q480 70 520 90 Q540 110 530 140 Q520 160 480 170 Q440 175 410 160 Q400 140 410 120 Q420 100 420 80 Z" 
                      fill="url(#landGradient)" stroke="#10b981" strokeWidth="1" opacity="0.4"/>
                
                
                <path d="M440 200 Q480 190 520 210 Q540 240 530 280 Q520 320 510 360 Q500 400 480 420 Q460 415 450 380 Q440 340 445 300 Q450 260 440 230 Z" 
                      fill="url(#landGradient)" stroke="#10b981" strokeWidth="1" opacity="0.4"/>
                
                
                <path d="M550 80 Q650 70 750 90 Q820 110 860 140 Q880 170 870 200 Q850 230 800 240 Q750 245 700 235 Q650 225 600 210 Q550 190 540 150 Q545 120 550 80 Z" 
                      fill="url(#landGradient)" stroke="#10b981" strokeWidth="1" opacity="0.4"/>
                
                
                <path d="M750 350 Q800 340 840 360 Q860 380 850 400 Q830 415 800 410 Q770 405 750 390 Q740 375 750 350 Z" 
                      fill="url(#landGradient)" stroke="#10b981" strokeWidth="1" opacity="0.4"/>

                
                {countryData.map((country) => {
                  const isSelected = selectedCountry === country.name;
                  const hasValidators = country.validators.length > 0;
                  
                  
                  const positions = {
                    
                    'United States': { x: 180, y: 160 },
                    'Canada': { x: 160, y: 120 },
                    'Mexico': { x: 150, y: 200 },
                    
                    
                    'Brazil': { x: 280, y: 340 },
                    'Argentina': { x: 260, y: 400 },
                    'Peru': { x: 240, y: 320 },
                    'Colombia': { x: 250, y: 280 },
                    'Chile': { x: 240, y: 420 },
                    
                    
                    'United Kingdom': { x: 430, y: 120 },
                    'Germany': { x: 470, y: 130 },
                    'France': { x: 450, y: 140 },
                    'Spain': { x: 430, y: 160 },
                    'Italy': { x: 480, y: 160 },
                    'Netherlands': { x: 460, y: 120 },
                    'Sweden': { x: 480, y: 100 },
                    'Poland': { x: 490, y: 120 },
                    
                    
                    'South Africa': { x: 490, y: 380 },
                    'Nigeria': { x: 460, y: 280 },
                    'Egypt': { x: 510, y: 240 },
                    'Morocco': { x: 430, y: 230 },
                    'Kenya': { x: 520, y: 320 },
                    
                    
                    'China': { x: 720, y: 180 },
                    'Japan': { x: 780, y: 170 },
                    'India': { x: 650, y: 210 },
                    'South Korea': { x: 760, y: 160 },
                    'Thailand': { x: 680, y: 230 },
                    'Singapore': { x: 690, y: 260 },
                    'Hong Kong': { x: 730, y: 200 },
                    'Russia': { x: 650, y: 120 },
                    
                    
                    'Australia': { x: 800, y: 380 },
                    'New Zealand': { x: 840, y: 420 }
                  };
                  
                  const pos = positions[country.name as keyof typeof positions];
                  if (!pos) return null; 

                  return (
                    <g key={country.name}>
                      
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={hasValidators ? "30" : "20"}
                        fill={isSelected ? "#3b82f6" : hasValidators ? "#10b981" : "#6b7280"}
                        fillOpacity={hasValidators ? "0.8" : "0.4"}
                        stroke={isSelected ? "#1d4ed8" : "#ffffff"}
                        strokeWidth={isSelected ? "4" : "2"}
                        className="cursor-pointer transition-all duration-300 hover:stroke-yellow-400 hover:stroke-3"
                        onClick={() => setSelectedCountry(isSelected ? null : country.name)}
                      />
                      
                      
                      {hasValidators && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r="35"
                          fill="none"
                          stroke={isSelected ? "#3b82f6" : "#10b981"}
                          strokeWidth="1"
                          strokeOpacity="0.3"
                          className="animate-pulse"
                        />
                      )}
                      
                      
                      {country.validators.slice(0, 8).map((validator, vIndex) => {
                        const angle = (vIndex / 8) * 2 * Math.PI;
                        const radius = 18;
                        const dotX = pos.x + Math.cos(angle) * radius;
                        const dotY = pos.y + Math.sin(angle) * radius;
                        
                        return (
                          <circle
                            key={validator.id}
                            cx={dotX}
                            cy={dotY}
                            r="4"
                            fill={validator.status === 'good' ? '#10b981' : 
                                  validator.status === 'moderate' ? '#f59e0b' : 
                                  validator.status === 'offline' ? '#ef4444' : '#6b7280'}
                            stroke="#ffffff"
                            strokeWidth="1"
                            className="animate-pulse"
                          />
                        );
                      })}
                      
                      
                      <rect
                        x={pos.x - (country.name.length * 3)}
                        y={pos.y + 38}
                        width={country.name.length * 6}
                        height="16"
                        fill="rgba(0,0,0,0.7)"
                        rx="8"
                        ry="8"
                      />
                      <text
                        x={pos.x}
                        y={pos.y + 49}
                        textAnchor="middle"
                        className="fill-white text-xs font-medium"
                        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                      >
                        {country.name}
                      </text>
                      
                      
                      {hasValidators && (
                        <>
                          <circle
                            cx={pos.x}
                            cy={pos.y}
                            r="12"
                            fill="rgba(0,0,0,0.8)"
                            stroke="#ffffff"
                            strokeWidth="2"
                          />
                          <text
                            x={pos.x}
                            y={pos.y + 5}
                            textAnchor="middle"
                            className="fill-white text-sm font-bold"
                            style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                          >
                            {country.validators.length}
                          </text>
                        </>
                      )}
                      
                      
                      {isSelected && country.validators.slice(0, 5).map((validator, vIndex) => {
                        const angle = (vIndex / 5) * 2 * Math.PI;
                        const radius = 50;
                        const lineX = pos.x + Math.cos(angle) * radius;
                        const lineY = pos.y + Math.sin(angle) * radius;
                        
                        return (
                          <line
                            key={`line-${validator.id}`}
                            x1={pos.x}
                            y1={pos.y}
                            x2={lineX}
                            y2={lineY}
                            stroke="#3b82f6"
                            strokeWidth="2"
                            strokeOpacity="0.6"
                            className="animate-pulse"
                          />
                        );
                      })}
                    </g>
                  );
                })}
              </svg>
              
              
              <div className="absolute bottom-4 left-4 bg-black/70 text-white p-3 rounded-lg text-xs space-y-1">
                <p className="font-semibold">🌍 Interactive World Map</p>
                <p>• Click countries to view validator details</p>
                <p>• Green: Active validators</p>
                <p>• Blue: Selected country</p>
                <p>• Gray: No validators</p>
              </div>
              
              
              {selectedCountryData && (
                <div className="absolute top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-sm max-w-48">
                  <h4 className="font-semibold mb-2">{selectedCountryData.name}</h4>
                  <div className="space-y-1 text-xs">
                    <p>📍 {selectedCountryData.validators.length} validators</p>
                    <p>{selectedCountryData.onlineCount} online</p>
                    <p>⚡ {selectedCountryData.avgLatency}ms avg</p>
                  </div>
                </div>
              )}
            </div>

            
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

          
          <div className="space-y-4">
            
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                GLOBAL OVERVIEW
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Active</p>
                  <p className="font-semibold text-green-600">{stats.online}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-semibold">{stats.total}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Avg Latency</p>
                  <p className="font-semibold">{stats.avgLatency}ms</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Countries</p>
                  <p className="font-semibold">{stats.countries}</p>
                </div>
              </div>
            </div>

            
            {selectedCountryData ? (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    {selectedCountryData.name}
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setSelectedCountry(null)}
                  >
                    ×
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Validators</p>
                    <p className="font-semibold">{selectedCountryData.validators.length}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Online</p>
                    <p className="font-semibold text-green-600">{selectedCountryData.onlineCount}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avg Latency</p>
                    <p className="font-semibold">{selectedCountryData.avgLatency}ms</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Uptime</p>
                    <p className="font-semibold">
                      {Math.round((selectedCountryData.onlineCount / selectedCountryData.validators.length) * 100)}%
                    </p>
                  </div>
                </div>

                
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Validators</h4>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {selectedCountryData.validators.map(validator => (
                      <div key={validator.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${getStatusColor(validator.status)}`}></div>
                          <span>{validator.city}</span>
                        </div>
                        <span className="text-muted-foreground">{validator.latency}ms</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="border rounded-lg p-4 text-center text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a country to view validator details</p>
              </div>
            )}

            
            <div className="space-y-2">
              <h3 className="font-semibold text-sm text-muted-foreground">TOP COUNTRIES</h3>
              <div className="space-y-1">
                {countryData.slice(0, 5).map(country => (
                  <div 
                    key={country.name}
                    className="flex items-center justify-between text-sm p-2 hover:bg-muted rounded cursor-pointer"
                    onClick={() => setSelectedCountry(country.name)}
                  >
                    <span className="font-medium">{country.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {country.validators.length}
                      </Badge>
                      <span className="text-muted-foreground text-xs">
                        {country.avgLatency}ms
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}