import {
  AvailableCountriesResponse,
  AvailableRegionsResponse,
  CustomTimePeriod,
  RegionalTimeSeriesResponse
} from "@/types/analytics";
import { useQuery } from "@tanstack/react-query";




export function useAvailableRegions(
  regionType: 'continent' | 'country' | 'city' = 'continent',
  monitorId?: string
) {
  return useQuery<AvailableRegionsResponse>({
    queryKey: ["available-regions", regionType, monitorId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('regionType', regionType);
      if (monitorId) {
        params.append('monitorId', monitorId);
      }

      const response = await fetch(`/api/analytics/available-regions?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch available regions");
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, 
    refetchInterval: 10 * 60 * 1000, 
  });
}


export function useAvailableCountries(monitorId?: string, continent?: string) {
  return useQuery<AvailableCountriesResponse>({
    queryKey: ["available-countries", monitorId, continent],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (monitorId) {
        params.append('monitorId', monitorId);
      }
      if (continent) {
        params.append('continent', continent);
      }

      const response = await fetch(`/api/analytics/available-countries?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch available countries");
      }
      
      return response.json();
    },
    staleTime: 5 * 60 * 1000, 
    refetchInterval: 10 * 60 * 1000, 
  });
}



export function useMonitorRegionalTimeseries(
  monitorId: string,
  regionType: 'continent' | 'country',
  regionCode: string,
  period: 'day' | 'week' | 'month' | 'custom' = 'day',
  custom?: { start: string; end: string }
) {
  return useQuery<RegionalTimeSeriesResponse>({
    queryKey: ["monitor-regional-timeseries", monitorId, regionType, regionCode, period, custom?.start, custom?.end],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('period', period);
      params.append('regionType', regionType);
      params.append('regionCode', regionCode);
      if (period === 'custom' && custom?.start && custom?.end) {
        params.append('start', custom.start);
        params.append('end', custom.end);
      }

      const response = await fetch(`/api/monitors/${monitorId}/regional-timeseries?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch regional timeseries");
      }
      return response.json();
    },
    enabled: !!monitorId && !!regionType && !!regionCode && (period !== 'custom' || (!!custom?.start && !!custom?.end)),
    refetchInterval: 60000,
    staleTime: 30000,
  });
}







export function useCustomTimePeriod() {
  const validatePeriod = (startDate: string, endDate: string): { isValid: boolean; error?: string } => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const now = new Date();
    
    if (start >= end) {
      return { isValid: false, error: "Start date must be before end date" };
    }
    
    if (end > now) {
      return { isValid: false, error: "End date cannot be in the future" };
    }
    
    const daysDifference = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDifference > 365) {
      return { isValid: false, error: "Date range cannot exceed 365 days" };
    }
    
    if (daysDifference < 1) {
      return { isValid: false, error: "Date range must be at least 1 day" };
    }
    
    return { isValid: true };
  };
  
  const createCustomPeriod = (startDate: string, endDate: string): CustomTimePeriod | null => {
    const validation = validatePeriod(startDate, endDate);
    
    if (!validation.isValid) {
      throw new Error(validation.error);
    }
    
    return {
      type: 'custom',
      startDate,
      endDate,
    };
  };
  
  return {
    validatePeriod,
    createCustomPeriod,
  };
}