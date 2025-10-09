export interface ValidatorLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  continent: string;
  continentCode: string;
  latitude: number;
  longitude: number;
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


export interface ValidatorFilters {
  countrycode?: string;
  city?: string;
  postalcode?: string;
  continent?: string;
}


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


export interface ValidatorBalance {
  totalEarnings: number;
  availableBalance: number;
  pendingWithdrawals: number;
  currency: string;
}

export interface ValidationSummary {
  totalValidations: number;
  successfulValidations: number;
  failedValidations: number;
  successRate: number;
  lastValidationDate: string;
}

export interface WithdrawalRequest {
  id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed" | "failed";
  requestedAt: string;
  processedAt?: string;
  transactionHash?: string;
}

export interface Transaction {
  id: string;
  type: "earnings" | "withdrawal" | "payment";
  amount: number;
  status: "completed" | "pending" | "failed";
  date: string;
  description: string;
  transactionHash?: string;
}

export interface ValidatorDashboardData {
  balance: ValidatorBalance;
  validationSummary: ValidationSummary;
  recentWithdrawals: WithdrawalRequest[];
  recentTransactions: Transaction[];
}
