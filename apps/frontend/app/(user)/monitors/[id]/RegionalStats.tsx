'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Globe, 
  Users, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  MapPin,
  Wifi
} from 'lucide-react';

interface ValidatorData {
  id: string;
  country: string;
  continent: string;
  city: string;
  lat: number;
  lng: number;
  latency: number;
  status: 'online' | 'offline' | 'moderate' | 'good';
  lastChecked: Date;
  ip: string;
}

interface RegionalStatsProps {
  validators: ValidatorData[];
}

interface RegionStats {
  continent: string;
  totalValidators: number;
  onlineValidators: number;
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  uptimePercentage: number;
  countries: Set<string>;
}

export function RegionalStats({ validators }: RegionalStatsProps) {
  const globalStats = useMemo(() => {
    const onlineValidators = validators.filter(v => v.status !== 'offline');
    const totalLatency = validators.reduce((sum, v) => sum + v.latency, 0);
    const avgLatency = validators.length > 0 ? Math.round(totalLatency / validators.length) : 0;
    const uniqueCountries = new Set(validators.map(v => v.country));
    const uniqueContinents = new Set(validators.map(v => v.continent));
    const uptimePercentage = validators.length > 0 ? Math.round((onlineValidators.length / validators.length) * 100) : 0;

    return {
      totalValidators: validators.length,
      onlineValidators: onlineValidators.length,
      avgLatency,
      countries: uniqueCountries.size,
      continents: uniqueContinents.size,
      uptimePercentage,
      bestLatency: validators.length > 0 ? Math.min(...validators.map(v => v.latency)) : 0,
      worstLatency: validators.length > 0 ? Math.max(...validators.map(v => v.latency)) : 0
    };
  }, [validators]);

  const regionalStats = useMemo(() => {
    const regionMap = new Map<string, RegionStats>();

    validators.forEach(validator => {
      const continent = validator.continent;
      
      if (!regionMap.has(continent)) {
        regionMap.set(continent, {
          continent,
          totalValidators: 0,
          onlineValidators: 0,
          avgLatency: 0,
          minLatency: Infinity,
          maxLatency: 0,
          uptimePercentage: 0,
          countries: new Set()
        });
      }

      const stats = regionMap.get(continent)!;
      stats.totalValidators++;
      stats.countries.add(validator.country);
      
      if (validator.status !== 'offline') {
        stats.onlineValidators++;
      }
      
      stats.minLatency = Math.min(stats.minLatency, validator.latency);
      stats.maxLatency = Math.max(stats.maxLatency, validator.latency);
    });

    
    regionMap.forEach(stats => {
      const regionValidators = validators.filter(v => v.continent === stats.continent);
      const totalLatency = regionValidators.reduce((sum, v) => sum + v.latency, 0);
      stats.avgLatency = Math.round(totalLatency / regionValidators.length);
      stats.uptimePercentage = Math.round((stats.onlineValidators / stats.totalValidators) * 100);
      stats.minLatency = stats.minLatency === Infinity ? 0 : stats.minLatency;
    });

    return Array.from(regionMap.values()).sort((a, b) => b.onlineValidators - a.onlineValidators);
  }, [validators]);

  const topPerformingRegion = useMemo(() => {
    return regionalStats.reduce((best, current) => 
      current.avgLatency < best.avgLatency ? current : best, 
      regionalStats[0] || { continent: 'N/A', avgLatency: Infinity }
    );
  }, [regionalStats]);

  const bottomPerformingRegion = useMemo(() => {
    return regionalStats.reduce((worst, current) => 
      current.avgLatency > worst.avgLatency ? current : worst, 
      regionalStats[0] || { continent: 'N/A', avgLatency: 0 }
    );
  }, [regionalStats]);

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Validators</span>
            </div>
            <div className="text-2xl font-bold">{globalStats.totalValidators}</div>
            <div className="text-xs text-muted-foreground">
              {globalStats.onlineValidators} online
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span className="text-sm text-muted-foreground">Avg Latency</span>
            </div>
            <div className="text-2xl font-bold">{globalStats.avgLatency}ms</div>
            <div className="text-xs text-muted-foreground">
              {globalStats.bestLatency}ms - {globalStats.worstLatency}ms
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="h-4 w-4 text-purple-500" />
              <span className="text-sm text-muted-foreground">Global Coverage</span>
            </div>
            <div className="text-2xl font-bold">{globalStats.countries}</div>
            <div className="text-xs text-muted-foreground">
              {globalStats.continents} continents
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-4 w-4 text-orange-500" />
              <span className="text-sm text-muted-foreground">Network Health</span>
            </div>
            <div className="text-2xl font-bold">{globalStats.uptimePercentage}%</div>
            <div className="text-xs text-muted-foreground">
              Uptime rate
            </div>
          </CardContent>
        </Card>
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Best Performing Region
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">{topPerformingRegion.continent}</span>
                <Badge variant="default" className="bg-green-500">
                  {topPerformingRegion.avgLatency}ms avg
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Validators</p>
                  <p className="font-semibold">{topPerformingRegion.onlineValidators}/{topPerformingRegion.totalValidators}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Countries</p>
                  <p className="font-semibold">{topPerformingRegion.countries?.size || 0}</p>
                </div>
              </div>
              <Progress value={topPerformingRegion.uptimePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {topPerformingRegion.uptimePercentage}% uptime rate
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Needs Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">{bottomPerformingRegion.continent}</span>
                <Badge variant="destructive">
                  {bottomPerformingRegion.avgLatency}ms avg
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Validators</p>
                  <p className="font-semibold">{bottomPerformingRegion.onlineValidators}/{bottomPerformingRegion.totalValidators}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Countries</p>
                  <p className="font-semibold">{bottomPerformingRegion.countries?.size || 0}</p>
                </div>
              </div>
              <Progress value={bottomPerformingRegion.uptimePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {bottomPerformingRegion.uptimePercentage}% uptime rate
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Regional Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {regionalStats.map((region) => (
              <div key={region.continent} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">{region.continent}</h3>
                  <div className="flex items-center gap-2">
                    {region.uptimePercentage >= 95 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                    <Badge 
                      variant={region.avgLatency < 150 ? "default" : region.avgLatency < 300 ? "secondary" : "destructive"}
                    >
                      {region.avgLatency}ms
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm mb-3">
                  <div>
                    <p className="text-muted-foreground">Validators</p>
                    <p className="font-semibold">{region.totalValidators}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Online</p>
                    <p className="font-semibold text-green-600">{region.onlineValidators}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Countries</p>
                    <p className="font-semibold">{region.countries.size}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Min Latency</p>
                    <p className="font-semibold text-green-600">{region.minLatency}ms</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Max Latency</p>
                    <p className="font-semibold text-red-600">{region.maxLatency}ms</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uptime Rate</span>
                    <span className="font-medium">{region.uptimePercentage}%</span>
                  </div>
                  <Progress value={region.uptimePercentage} className="h-2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}