import { useQuery } from "@tanstack/react-query";
import { 
  ValidatorsResponse, 
  ValidatorFilters
} from "@/types/validator";

const API_BASE = "/api/validators";


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
    refetchInterval: 60000, 
  });
}
