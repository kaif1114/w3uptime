import { useQuery } from "@tanstack/react-query";
import { 
  AvailableRegionsResponse,
  AvailableCountriesResponse,
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




// ===== UTILITY HOOKS =====



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