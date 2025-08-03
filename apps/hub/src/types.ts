export interface SignupIncomingMessage {
  ip: string;
  publicKey: string;
  callbackId: string;
}

export interface ValidateIncomingMessage {
  callbackId: string;
  publicKey: string;
  status: "Good" | "Bad";
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
  monitorId: string;
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
      signedMessage: string;
    }
  | {
      type: "validate";
      data: ValidateIncomingMessage;
      signedMessage: string;
    };

export type OutgoingMessage =
  {
      type: "signup";
      data: SignupOutgoingMessage;
      signedMessage: string;
    }
  | {
      type: "validate";
      data: ValidateOutgoingMessage;
      signedMessage: string;
    }
  | {
      type: "error";
      data: ErrorMessage;
    }
