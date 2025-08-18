import { useQuery } from "@tanstack/react-query";
import { 
  ValidatorsResponse, 
  ValidatorCountResponse, 
  ValidatorFilters,
  Validator,
  CountryValidatorData,
  CityValidatorData,
  ContinentValidatorData
} from "@/types/validator";

const API_BASE = "/api/validators";

// Fetch all validators with optional filters
export function useValidators(filters?: ValidatorFilters) {
  const queryParams = new URLSearchParams();
  if (filters?.countrycode) queryParams.append('countrycode', filters.countrycode);
  if (filters?.city) queryParams.append('city', filters.city);
  if (filters?.postalcode) queryParams.append('postalcode', filters.postalcode);
  if (filters?.continent) queryParams.append('continent', filters.continent);
  
  const queryString = queryParams.toString();
  const url = queryString ? `${API_BASE}?${queryString}` : API_BASE;

  return useQuery<ValidatorsResponse>({
    queryKey: ["validators", filters],
    queryFn: async () => {
      const response = await fetch(url, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch validators");
      }
      return response.json();
    },
    refetchInterval: 60000, // Refetch every minute as validators can connect/disconnect
  });
}

// Fetch validator count
export function useValidatorCount() {
  return useQuery<ValidatorCountResponse>({
    queryKey: ["validators", "count"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE}/count`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch validator count");
      }
      return response.json();
    },
    refetchInterval: 60000,
  });
}

// Fetch validators by country
export function useValidatorsByCountry(countryCode: string) {
  return useValidators({ countrycode: countryCode });
}

// Fetch validators by continent
export function useValidatorsByContinent(continent: string) {
  return useValidators({ continent });
}

// Fetch validators by city
export function useValidatorsByCity(city: string) {
  return useValidators({ city });
}

// Custom hook to aggregate validators by country
export function useValidatorsByCountryAggregated() {
  const { data, ...rest } = useValidators();
  
  const aggregatedData: CountryValidatorData[] = [];
  
  if (data?.validators) {
    const countryMap = new Map<string, CountryValidatorData>();
    
    data.validators.forEach((validator: Validator) => {
      const countryKey = validator.location.countryCode;
      
      if (!countryMap.has(countryKey)) {
        countryMap.set(countryKey, {
          name: validator.location.country,
          code: validator.location.countryCode,
          validators: [],
          count: 0,
          cities: []
        });
      }
      
      const country = countryMap.get(countryKey)!;
      country.validators.push(validator);
      country.count++;
    });

    // Aggregate cities within each country
    countryMap.forEach((country) => {
      const cityMap = new Map<string, CityValidatorData>();
      
      country.validators.forEach((validator) => {
        const cityKey = validator.location.city.toLowerCase();
        
        if (!cityMap.has(cityKey)) {
          cityMap.set(cityKey, {
            name: validator.location.city,
            count: 0,
            validators: []
          });
        }
        
        const city = cityMap.get(cityKey)!;
        city.validators.push(validator);
        city.count++;
      });
      
      country.cities = Array.from(cityMap.values()).sort((a, b) => b.count - a.count);
    });

    aggregatedData.push(...Array.from(countryMap.values()).sort((a, b) => b.count - a.count));
  }
  
  return {
    data: aggregatedData,
    ...rest
  };
}

// Custom hook to aggregate validators by continent
export function useValidatorsByContinentAggregated() {
  const { data, ...rest } = useValidators();
  
  const aggregatedData: ContinentValidatorData[] = [];
  
  if (data?.validators) {
    const continentMap = new Map<string, ContinentValidatorData>();
    
    data.validators.forEach((validator: Validator) => {
      const continentKey = validator.location.continentCode;
      
      if (!continentMap.has(continentKey)) {
        continentMap.set(continentKey, {
          name: validator.location.continent,
          code: validator.location.continentCode,
          validators: [],
          count: 0,
          countries: []
        });
      }
      
      const continent = continentMap.get(continentKey)!;
      continent.validators.push(validator);
      continent.count++;
    });

    // Aggregate countries within each continent
    continentMap.forEach((continent) => {
      const countryMap = new Map<string, CountryValidatorData>();
      
      continent.validators.forEach((validator) => {
        const countryKey = validator.location.countryCode;
        
        if (!countryMap.has(countryKey)) {
          countryMap.set(countryKey, {
            name: validator.location.country,
            code: validator.location.countryCode,
            validators: [],
            count: 0,
            cities: []
          });
        }
        
        const country = countryMap.get(countryKey)!;
        country.validators.push(validator);
        country.count++;
      });
      
      // Aggregate cities within each country
      countryMap.forEach((country) => {
        const cityMap = new Map<string, CityValidatorData>();
        
        country.validators.forEach((validator) => {
          const cityKey = validator.location.city.toLowerCase();
          
          if (!cityMap.has(cityKey)) {
            cityMap.set(cityKey, {
              name: validator.location.city,
              count: 0,
              validators: []
            });
          }
          
          const city = cityMap.get(cityKey)!;
          city.validators.push(validator);
          city.count++;
        });
        
        country.cities = Array.from(cityMap.values()).sort((a, b) => b.count - a.count);
      });
      
      continent.countries = Array.from(countryMap.values()).sort((a, b) => b.count - a.count);
    });

    aggregatedData.push(...Array.from(continentMap.values()).sort((a, b) => b.count - a.count));
  }
  
  return {
    data: aggregatedData,
    ...rest
  };
}