export interface ValidatorLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  continent: string;
  continentCode: string;
  flag: string | null;
}

export interface Validator {
  validatorId: string;
  location: ValidatorLocation;
}

export interface ValidatorsResponse {
  validators: Validator[];
}

export interface ValidatorCountResponse {
  count: number;
}

// Query parameters for filtering validators
export interface ValidatorFilters {
  countrycode?: string;
  city?: string;
  postalcode?: string;
  continent?: string;
}

// Aggregated data for display
export interface CountryValidatorData {
  name: string;
  code: string;
  validators: Validator[];
  count: number;
  cities: CityValidatorData[];
}

export interface CityValidatorData {
  name: string;
  count: number;
  validators: Validator[];
}

export interface ContinentValidatorData {
  name: string;
  code: string;
  validators: Validator[];
  count: number;
  countries: CountryValidatorData[];
}