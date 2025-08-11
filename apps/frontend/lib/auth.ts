import { NextRequest } from 'next/server';
import { prisma } from 'db/client';

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
export async function authenticateRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // Get session ID from cookie
    const sessionId = request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return {
        authenticated: false,
        user: null,
        session: null,
        error: 'No session found'
      };
    }

    // Find session in database
    const session = await prisma.session.findUnique({
      where: { sessionId },
      include: {
        user: {
          select: {
            id: true,
            walletAddress: true,
            createdAt: true,
            updatedAt: true
          }
        }
      }
    });

    if (!session) {
      return {
        authenticated: false,
        user: null,
        session: null,
        error: 'Invalid session'
      };
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      // Clean up expired session
      await prisma.session.delete({
        where: { sessionId }
      });

      return {
        authenticated: false,
        user: null,
        session: null,
        error: 'Session expired'
      };
    }

    // Session is valid
    return {
      authenticated: true,
      user: session.user as AuthenticatedUser,
      session: {
        id: session.id,
        walletAddress: session.walletAddress,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent || undefined,
        ipAddress: session.ipAddress || undefined
      },
      error: null
    };

  } catch (error) {
    console.error('Authentication error:', error);
    return {
      authenticated: false,
      user: null,
      session: null,
      error: 'Authentication failed'
    };
  }
}

/**
 * Helper function to create unauthorized response
 */
export function createUnauthorizedResponse(error: string = 'Unauthorized') {
  return Response.json({
    success: false,
    error,
    authenticated: false
  }, { 
    status: 401,
    headers: {
      'Set-Cookie': 'sessionId=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0'
    }
  });
}

/**
 * Wrapper function for protected API routes
 * Use this to wrap your API handlers that require authentication
 */
export function withAuth<T extends any[]>(
  handler: (request: NextRequest, user: AuthenticatedUser, session: SessionData, ...args: T) => Promise<Response>
) {
  return async (request: NextRequest, ...args: T): Promise<Response> => {
    const authResult = await authenticateRequest(request);
    
    if (!authResult.authenticated || !authResult.user || !authResult.session) {
      return createUnauthorizedResponse(authResult.error || 'Authentication required');
    }

    return handler(request, authResult.user, authResult.session, ...args);
  };
}

/**
 * Clean up expired sessions (call this periodically, e.g., via a cron job)
 */
export async function cleanupExpiredSessions(): Promise<number> {
  try {
    const result = await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    });

    return result.count;
  } catch (error) {
    console.error('Error cleaning up expired sessions:', error);
    return 0;
  }
}
