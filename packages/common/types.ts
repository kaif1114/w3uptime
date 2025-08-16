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