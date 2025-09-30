export interface SignupIncomingMessage {
  ip: string;
  publicKey: string;
  walletAddress: string;
  callbackId: string;
}

export interface ValidateIncomingMessage {
  callbackId: string;
  publicKey: string;
  status: MonitorTickStatus;
  latency: number;
  monitorId: string;
  validatorId: string;
}

export interface SignupOutgoingMessage {
  validatorId: string;
  callbackId: string;
}

export interface ValidateOutgoingMessage {
  url: string;
  callbackId: string;
}

export interface ErrorMessage {
  message: string;
}

export interface SuccessMessage {
  success: boolean;
  message: string;
}

export type IncomingMessage =
  {
      type: "signup";
      data: SignupIncomingMessage;
      signature: string;
    }
  | {
      type: "validate";
      data: ValidateIncomingMessage;
      signature: string;
    };

export type OutgoingMessage =
  {
      type: "signup";
      data: SignupOutgoingMessage;
     
    }
  | {
      type: "validate";
      data: ValidateOutgoingMessage;
    
    }
  | {
      type: "error";
      data: ErrorMessage;
    }

export enum MonitorTickStatus {
  GOOD = "GOOD",
  BAD = "BAD",
}

export interface MonitorTickBatchItem {
  monitorId: string;
  validatorId: string;
  status: MonitorTickStatus;
  latency: number;
  longitude: number;
  latitude: number;
  countryCode: string;
  continentCode: string;
  city: string;
  createdAt: Date;
}

export interface MonitorTickBatchRequest {
  batch: MonitorTickBatchItem[];
  batchId: string;
  timestamp: string;
}

export interface MonitorTickBatchResponse {
  success: boolean;
  message: string;
  processedCount?: number;
  errors?: {
    index: number;
    error: string;
  }[];
}

export interface DepositEvent {
  fromAddress: string;
  amount: string;
  timestamp: string;
  transactionHash: string;
  blockNumber: number;
}

export interface TransactionHistoryItem {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  fromAddress: string | null;
  toAddress: string | null;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  createdAt: Date;
}

export interface DepositHistoryItem {
  id: string;
  fromAddress: string;
  amount: string;
  transactionHash: string;
  blockNumber: number;
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';
  createdAt: Date;
}

export interface DepositHistoryResponse {
  success: boolean;
  data: {
    deposits: DepositHistoryItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    userBalance: number;
  };
}