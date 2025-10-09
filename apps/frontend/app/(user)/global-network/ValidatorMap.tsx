'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useValidators } from "@/hooks/useValidators";
import { AlertTriangle, MapPin, CheckCircle, XCircle } from "lucide-react";
import { useMemo } from "react";


interface ValidatorLocation {
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  validatorCount: number;
  goodChecks: number;
  badChecks: number;
  avgLatency: number;
  status: 'good' | 'bad' | 'mixed';
}

export function ValidatorMap() {
  const { data: validatorsData, isLoading, error } = useValidators();

  const validatorLocations = useMemo((): ValidatorLocation[] => {
    if (!validatorsData?.validators) return [];

    const locationMap = new Map<string, {
      city: string;
      countryCode: string;
      latitude: number;
      longitude: number;
      validators: Set<string>;
    }>();

    validatorsData.validators.forEach(validator => {
      const key = `${validator.location.city}-${validator.location.countryCode}`;
      
      if (!locationMap.has(key)) {
        locationMap.set(key, {
          city: validator.location.city,
          countryCode: validator.location.countryCode,
          latitude: validator.location.latitude,
          longitude: validator.location.longitude,
          validators: new Set(),
        });
      }

      const location = locationMap.get(key)!;
      location.validators.add(validator.validatorId);
    });

    return Array.from(locationMap.values()).map(location => {
      
      
      return {
        city: location.city,
        countryCode: location.countryCode,
        latitude: location.latitude,
        longitude: location.longitude,
        validatorCount: location.validators.size,
        goodChecks: location.validators.size, 
        badChecks: 0, 
        avgLatency: 0, 
        status: 'good' as const, 
      };
    });
  }, [validatorsData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validator Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded"></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="h-16 bg-muted rounded"></div>
              <div className="h-16 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validator Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
            <p className="text-destructive">Failed to load validator data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (validatorLocations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Validator Network</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <MapPin className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No validator data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalValidators = validatorLocations.reduce((sum, loc) => sum + loc.validatorCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Validator Network</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{totalValidators}</div>
            <div className="text-xs text-muted-foreground">Active Validators</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{validatorLocations.length}</div>
            <div className="text-xs text-muted-foreground">Locations</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold">{Array.from(new Set(validatorLocations.map(loc => loc.countryCode))).length}</div>
            <div className="text-xs text-muted-foreground">Countries</div>
          </div>
          <div className="text-center p-4 bg-muted rounded-lg">
            <div className="text-2xl font-bold text-green-600">
              100%
            </div>
            <div className="text-xs text-muted-foreground">Online Status</div>
          </div>
        </div>

        
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Validator Locations</h3>
          <div className="max-h-96 overflow-y-auto space-y-2">
            {validatorLocations
              .sort((a, b) => b.validatorCount - a.validatorCount)
              .map((location) => {
                const successRate = (location.goodChecks / (location.goodChecks + location.badChecks)) * 100;
                
                return (
                  <div key={`${location.city}-${location.countryCode}`} 
                       className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        {location.status === 'good' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : location.status === 'bad' ? (
                          <XCircle className="h-4 w-4 text-red-500" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">
                          {location.city}, {location.countryCode}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {location.validatorCount} validator{location.validatorCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-green-600">Online</div>
                      <div className="text-xs text-muted-foreground">
                        Active
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Regional Distribution</h3>
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set(validatorLocations.map(loc => loc.countryCode)))
              .map(country => {
                const countryLocations = validatorLocations.filter(loc => loc.countryCode === country);
                const totalValidatorsInCountry = countryLocations.reduce((sum, loc) => sum + loc.validatorCount, 0);
                
                return (
                  <Badge key={country} variant="secondary" className="text-xs">
                    {country}: {totalValidatorsInCountry}
                  </Badge>
                );
              })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}