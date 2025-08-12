export interface AuthenticatedUser {
    id: string;
    walletAddress: string;
    createdAt: Date;
    updatedAt: Date;
  }
  
  export interface SessionData {
    id: string;
    walletAddress: string;
    createdAt: Date;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }