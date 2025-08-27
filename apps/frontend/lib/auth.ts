import { NextRequest } from "next/server";
import { prisma } from "db/client";
import { AuthenticatedUser, SessionData } from "@/types/auth";
import { ethers } from "ethers";

export interface AuthResult {
  authenticated: boolean;
  user: AuthenticatedUser | null;
  session: SessionData | null;
  error: string | null;
}

/**
 * Middleware function to authenticate requests based on session cookie
 * Use this in API routes that require authentication
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  try {
    const sessionId = request.cookies.get("sessionId")?.value;

    if (!sessionId) {
      return {
        authenticated: false,
        user: null,
        session: null,
        error: "No session found",
      };
    }

    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    

    if (!session) {
      return {
        authenticated: false,
        user: null,
        session: null,
        error: "Invalid session",
      };
    }

    if (new Date() > session.expiresAt) {
      console.log("Session expired, deleting session");
      await prisma.session.delete({
        where: { sessionId },
      });

      return {
        authenticated: false,
        user: null,
        session: null,
        error: "Session expired",
      };
    }
  
    return {
      authenticated: true,
      user: session.user as AuthenticatedUser,
      session: {
        id: session.id,
        walletAddress: session.walletAddress,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent || undefined,
        ipAddress: session.ipAddress || undefined,
      },
      error: null,
    };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      authenticated: false,
      user: null,
      session: null,
      error: "Authentication failed",
    };
  }
}

/**
 * Helper function to create unauthorized response
 */
export function createUnauthorizedResponse(error: string = "Unauthorized") {
  return Response.json(
    {
      success: false,
      error,
      authenticated: false,
    },
    {
      status: 401,
      headers: {
        "Set-Cookie":
          "sessionId=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0",
      },
    }
  );
}

/**
 * Wrapper function for protected API routes
 * Use this to wrap your API handlers that require authentication
 */
export function withAuth<T extends any[]>(
  handler: (
    request: NextRequest,
    user: AuthenticatedUser,
    session: SessionData,
    ...args: T
  ) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authResult = await authenticateRequest(request);

    if (!authResult.authenticated || !authResult.user || !authResult.session) {
      return createUnauthorizedResponse(
        authResult.error || "Authentication required"
      );
    }

    return handler(request, authResult.user, authResult.session, ...args);
  };
}

/**
 * Clean up expired sessions (we will call this periodically, e.g., via a cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  } catch (error) {
    console.error("Error cleaning up expired sessions:", error);
    return 0;
  }
}

export const connectWallet = async () : Promise<AuthResult | undefined> => {
  try {
    if (!window?.ethereum) {
      throw new Error("Please install MetaMask to continue!");
    }

    const provider = new ethers.BrowserProvider(window.ethereum);
    const accounts: string[] = await provider.send("eth_requestAccounts", []);

    if (accounts.length === 0) {
      throw new Error("No wallet accounts found. Please connect your wallet.");
    }

    const walletAddress = accounts[0];

    return await authenticateWallet(walletAddress, provider);
  } catch (error) {
    console.error("Wallet connection error:", error);
   
  }
};

export const authenticateWallet = async (
  walletAddress: string,
  provider: ethers.BrowserProvider
) => {
  try {
    const nonceResponse = await fetch("/api/auth/nonce", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ walletAddress }),
    });

    const nonceData = await nonceResponse.json();

    if (!nonceData.success) {
      throw new Error(nonceData.error || "Failed to get nonce");
    }

    const { nonce } = nonceData;

    const signer = await provider.getSigner();
    const signature = await signer.signMessage(nonce);

    const verifyResponse = await fetch("/api/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        walletAddress,
        signature,
      }),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      throw new Error(verifyData.error || "Authentication failed");
    }

    return verifyData;
  } catch (error) {
    console.error("Authentication error:", error);
  }
};


export const logout = async () => {
  try {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    // Remove session cache so all consumers switch to unauthenticated state
    // queryClient.removeQueries({ queryKey: ["session"] });
  } catch (error) {
    console.error("Logout error:", error);
  }
};