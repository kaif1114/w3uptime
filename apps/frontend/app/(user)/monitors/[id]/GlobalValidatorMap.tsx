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

  // Group validators by country
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

    // Calculate average latency for each country
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
          {/* World Map Visualization */}
          <div className="lg:col-span-2 space-y-4">
            {/* World Map Container */}
            <div className="h-96 bg-gradient-to-b from-blue-900 via-blue-800 to-blue-900 rounded-lg overflow-hidden relative">
              {/* World Map Background */}
              <div className="absolute inset-0 bg-gradient-to-r from-green-800/20 via-yellow-800/20 to-green-800/20"></div>
              
              {/* Simulated World Map with Countries */}
              <svg
                viewBox="0 0 1000 500"
                className="w-full h-full"
                style={{ filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.1))' }}
              >
                {/* Major Country Shapes (simplified) */}
                {countryData.map((country, index) => {
                  const isSelected = selectedCountry === country.name;
                  const hasValidators = country.validators.length > 0;
                  
                  // Calculate position based on country (simplified positioning)
                  const positions = {
                    'United States': { x: 200, y: 150 },
                    'Canada': { x: 180, y: 100 },
                    'United Kingdom': { x: 450, y: 130 },
                    'Germany': { x: 480, y: 140 },
                    'France': { x: 460, y: 160 },
                    'Japan': { x: 800, y: 180 },
                    'Australia': { x: 820, y: 350 },
                    'Brazil': { x: 300, y: 320 },
                    'India': { x: 650, y: 220 },
                    'China': { x: 750, y: 160 },
                    'South Africa': { x: 520, y: 380 },
                    'Russia': { x: 600, y: 100 }
                  };
                  
                  const pos = positions[country.name as keyof typeof positions] || { 
                    x: 100 + (index * 80) % 800, 
                    y: 100 + Math.floor(index / 10) * 60 
                  };

                  return (
                    <g key={country.name}>
                      {/* Country highlighting */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={hasValidators ? "25" : "15"}
                        fill={isSelected ? "#3b82f6" : hasValidators ? "#10b981" : "#6b7280"}
                        fillOpacity={hasValidators ? "0.7" : "0.3"}
                        stroke={isSelected ? "#1d4ed8" : "#ffffff"}
                        strokeWidth={isSelected ? "3" : "1"}
                        className="cursor-pointer transition-all duration-200 hover:stroke-white hover:stroke-2"
                        onClick={() => setSelectedCountry(isSelected ? null : country.name)}
                      />
                      
                      {/* Validator dots within country */}
                      {country.validators.slice(0, 5).map((validator, vIndex) => (
                        <circle
                          key={validator.id}
                          cx={pos.x + (vIndex - 2) * 8}
                          cy={pos.y + (vIndex % 2 === 0 ? -8 : 8)}
                          r="3"
                          fill={validator.status === 'good' ? '#10b981' : 
                                validator.status === 'moderate' ? '#f59e0b' : 
                                validator.status === 'offline' ? '#ef4444' : '#6b7280'}
                          className="animate-pulse"
                        />
                      ))}
                      
                      {/* Country label */}
                      <text
                        x={pos.x}
                        y={pos.y + 35}
                        textAnchor="middle"
                        className="fill-white text-xs font-medium"
                        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                      >
                        {country.name}
                      </text>
                      
                      {/* Validator count */}
                      {hasValidators && (
                        <text
                          x={pos.x}
                          y={pos.y + 5}
                          textAnchor="middle"
                          className="fill-white text-sm font-bold"
                          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
                        >
                          {country.validators.length}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
              
              {/* Instructions */}
              <div className="absolute bottom-4 left-4 bg-black/50 text-white p-2 rounded text-xs">
                Click on countries to view validator details
              </div>
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
          <div className="space-y-4">
            {/* Global Stats */}
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

            {/* Selected Country Details */}
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

                {/* Validator List */}
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

            {/* Top Countries */}
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