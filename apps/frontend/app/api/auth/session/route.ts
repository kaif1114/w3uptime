import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';

export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'No session found',
        authenticated: false
      }, { status: 401 });
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
            balance: true
          }
        }
      }
    });

    if (!session) {
      const response = NextResponse.json({
        success: false,
        error: 'Invalid session',
        authenticated: false
      }, { status: 401 });

      response.cookies.set('sessionId', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });

      return response;
    }


    if (new Date() > session.expiresAt) {
      await prisma.session.delete({
        where: { sessionId }
      });

      const response = NextResponse.json({
        success: false,
        error: 'Session expired',
        authenticated: false
      }, { status: 401 });

      response.cookies.set('sessionId', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/'
      });

      return response;
    }

    const sanitizedUser = {
      ...session.user,
      balance: session.user.balance ? BigInt(session.user.balance.toString()).toString() : "0"
    };
    console.log("sanitizedUser", sanitizedUser);
    return NextResponse.json({
      success: true,
      authenticated: true,
      user: sanitizedUser,
      session: {
        id: session.id,
        walletAddress: session.walletAddress,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
        userAgent: session.userAgent,
        ipAddress: session.ipAddress
      }
    });

  } catch (error) {
    console.error('Error checking session:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      authenticated: false
    }, { status: 500 });
  }
}
