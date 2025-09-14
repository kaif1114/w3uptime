import { useQuery } from "@tanstack/react-query";
import { 
  AvailableRegionsResponse,
  AvailableCountriesResponse,
  RegionalTimeSeriesResponse,
  CountryAnalyticsResponse,
  EnhancedTimePeriod,
  CustomTimePeriod,
} from "@/types/analytics";

// ===== AVAILABLE REGIONS HOOKS =====

/**
 * Hook to fetch available regions for analytics
 */
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
    staleTime: 5 * 60 * 1000, // 5 minutes - regions don't change often
    refetchInterval: 10 * 60 * 1000, // Refetch every 10 minutes
  });
}

/**
 * Hook to fetch available countries, optionally filtered by continent
 */
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}

// ===== REGIONAL ANALYTICS HOOKS =====

/**
 * Hook to fetch regional timeseries data
 */
export function useRegionalTimeseries(
  region: string,
  regionType: 'continent' | 'country' | 'city',
  period: EnhancedTimePeriod | string,
  customPeriod?: CustomTimePeriod,
  enabled: boolean = true
) {
  return useQuery<RegionalTimeSeriesResponse>({
    queryKey: ["regional-timeseries", region, regionType, period, customPeriod],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('region', region);
      params.append('regionType', regionType);
      
      if (customPeriod && period === 'custom') {
        params.append('period', 'day'); // Use day as base period for custom ranges
        params.append('startTime', customPeriod.startDate);
        params.append('endTime', customPeriod.endDate);
      } else {
        params.append('period', period as string);
      }

      const response = await fetch(`/api/analytics/regional-timeseries?${params.toString()}`, {
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
    enabled: enabled && !!region,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch country-specific analytics with timeseries and statistics
 */
export function useCountryAnalytics(
  country: string,
  period: EnhancedTimePeriod | string,
  customPeriod?: CustomTimePeriod,
  includeStats: boolean = true,
  enabled: boolean = true
) {
  return useQuery<CountryAnalyticsResponse>({
    queryKey: ["country-analytics", country, period, customPeriod, includeStats],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('country', country);
      params.append('includeStats', includeStats.toString());
      
      if (customPeriod && period === 'custom') {
        params.append('period', 'day'); // Use day as base period for custom ranges
        params.append('startTime', customPeriod.startDate);
        params.append('endTime', customPeriod.endDate);
      } else {
        params.append('period', period as string);
      }

      const response = await fetch(`/api/analytics/country-timeseries?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch country analytics");
      }
      
      return response.json();
    },
    enabled: enabled && !!country,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  });
}

// ===== MULTI-REGION COMPARISON HOOKS =====

/**
 * Hook to fetch multiple regional timeseries for comparison
 */
export function useMultiRegionalComparison(
  regions: Array<{ region: string; regionType: 'continent' | 'country' | 'city'; label?: string }>,
  period: EnhancedTimePeriod | string,
  customPeriod?: CustomTimePeriod,
  enabled: boolean = true
) {
  // Create queries for each region
  const queries = regions.map(({ region, regionType, label }) => ({
    queryKey: ["regional-comparison", region, regionType, period, customPeriod],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('region', region);
      params.append('regionType', regionType);
      
      if (customPeriod && period === 'custom') {
        params.append('period', 'day');
        params.append('startTime', customPeriod.startDate);
        params.append('endTime', customPeriod.endDate);
      } else {
        params.append('period', period as string);
      }

      const response = await fetch(`/api/analytics/regional-timeseries?${params.toString()}`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch timeseries for ${region}`);
      }
      
      const data = await response.json();
      return {
        ...data,
        label: label || region,
        region,
        regionType,
      };
    },
    enabled: enabled && !!region,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  }));

  // Use useQuery for each region separately to handle them independently
  return queries.map(query => useQuery(query));
}

// ===== UTILITY HOOKS =====

/**
 * Hook to get available continents for dropdown filtering
 */
export function useContinentOptions(monitorId?: string) {
  const { data, isLoading, error } = useAvailableRegions('continent', monitorId);
  
  return {
    options: data?.regions.map(region => ({
      value: region.region_id,
      label: region.region_name,
      dataCount: region.data_count,
    })) || [],
    isLoading,
    error,
  };
}

/**
 * Hook to get available countries for dropdown filtering
 */
export function useCountryOptions(monitorId?: string, continent?: string) {
  const { data, isLoading, error } = useAvailableCountries(monitorId, continent);
  
  return {
    options: data?.countries.map(country => ({
      value: country.country_code,
      label: country.country_name,
      continent: country.continent_code,
      performance: {
        avgLatency: country.avg_latency,
        successRate: country.success_rate,
        totalChecks: country.total_checks,
      },
    })) || [],
    isLoading,
    error,
  };
}

/**
 * Hook for handling custom time periods with validation
 */
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