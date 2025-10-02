import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';

async function authenticateRequest(request: NextRequest) {
  const sessionId = request.cookies.get('sessionId')?.value;

  if (!sessionId) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { sessionId },
    include: {
      user: {
        select: {
          id: true,
          walletAddress: true,
          balance: true
        }
      }
    }
  });

  if (!session || new Date() > session.expiresAt) {
    return null;
  }

  return session;
}

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await authenticateRequest(request);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { id } = params;

    const withdrawal = await prisma.transaction.findFirst({
      where: {
        id,
        type: 'WITHDRAWAL',
        userId: session.user.id
      },
      select: {
        id: true,
        toAddress: true,
        amount: true,
        transactionHash: true,
        blockNumber: true,
        status: true,
        createdAt: true,
        processedAt: true
      }
    });

    if (!withdrawal) {
      return NextResponse.json({
        success: false,
        error: 'Withdrawal not found'
      }, { status: 404 });
    }

    // Format withdrawal to match frontend expectations
    const formattedWithdrawal = {
      id: withdrawal.id,
      amount: parseFloat((BigInt(withdrawal.amount) / BigInt(Math.pow(10, 15))).toString()) / 1000, // Convert to ETH
      status: withdrawal.status.toLowerCase() as 'pending' | 'completed' | 'failed',
      requestedAt: withdrawal.createdAt.toISOString(),
      processedAt: withdrawal.processedAt?.toISOString(),
      transactionHash: withdrawal.transactionHash || undefined
    };

    return NextResponse.json({
      success: true,
      data: formattedWithdrawal
    });

  } catch (error) {
    console.error('Error fetching withdrawal details:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch withdrawal details'
    }, { status: 500 });
  }
}