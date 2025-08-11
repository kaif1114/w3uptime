import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';

export async function POST(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json({
        success: false,
        error: 'No active session found'
      }, { status: 401 });
    }

    await prisma.session.delete({
      where: { sessionId }
    }).catch(() => {
      console.log('Session not found in database, clearing cookie anyway');
    });


    const response = NextResponse.json({
      success: true,
      message: 'Logged out successfully'
    });

    response.cookies.set('sessionId', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0, 
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Error during logout:', error);

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
