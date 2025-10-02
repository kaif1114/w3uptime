import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { z } from 'zod';

const WithdrawalRequestSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
});

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

export async function GET(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = (page - 1) * limit;

    const withdrawals = await prisma.transaction.findMany({
      where: {
        type: 'WITHDRAWAL',
        userId: session.user.id
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
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

    const totalCount = await prisma.transaction.count({
      where: {
        type: 'WITHDRAWAL',
        userId: session.user.id
      }
    });

    // Format withdrawals to match frontend expectations
    const formattedWithdrawals = withdrawals.map(withdrawal => ({
      id: withdrawal.id,
      amount: parseFloat((BigInt(withdrawal.amount) / BigInt(Math.pow(10, 15))).toString()) / 1000, // Convert to ETH
      status: withdrawal.status.toLowerCase() as 'pending' | 'completed' | 'failed',
      requestedAt: withdrawal.createdAt.toISOString(),
      processedAt: withdrawal.processedAt?.toISOString(),
      transactionHash: withdrawal.transactionHash
    }));

    return NextResponse.json({
      success: true,
      data: {
        withdrawals: formattedWithdrawals,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        userBalance: session.user.balance
      }
    });

  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch withdrawal history'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await authenticateRequest(request);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const body = await request.json();
    const { amount } = WithdrawalRequestSchema.parse(body);
    
    const amountWei = BigInt(parseFloat(amount) * Math.pow(10, 18));
    const amountInternalUnits = Math.floor(parseFloat(amount) * 1000); // Internal balance units

    // Validate amount
    if (amountWei <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be greater than 0'
      }, { status: 400 });
    }

    // Check user balance
    if (session.user.balance < amountInternalUnits) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient balance'
      }, { status: 400 });
    }

    // Create pending withdrawal record
    const withdrawal = await prisma.transaction.create({
      data: {
        type: 'WITHDRAWAL',
        toAddress: session.user.walletAddress,
        amount: amountWei.toString(),
        transactionHash: '', // Will be filled when blockchain transaction is made
        blockNumber: 0, // Will be filled when blockchain transaction is confirmed
        status: 'PENDING',
        userId: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        withdrawalId: withdrawal.id,
        amount: parseFloat(amount),
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error creating withdrawal request:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.errors
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create withdrawal request'
    }, { status: 500 });
  }
}