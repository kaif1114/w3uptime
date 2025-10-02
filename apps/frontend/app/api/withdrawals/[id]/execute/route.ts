import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { z } from 'zod';

const ExecuteWithdrawalSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format'),
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

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await authenticateRequest(request);

    if (!session) {
      return NextResponse.json({
        success: false,
        error: 'Authentication required'
      }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { transactionHash } = ExecuteWithdrawalSchema.parse(body);

    // Find the withdrawal request
    const withdrawal = await prisma.transaction.findFirst({
      where: {
        id,
        type: 'WITHDRAWAL',
        userId: session.user.id,
        status: 'PENDING'
      }
    });

    if (!withdrawal) {
      return NextResponse.json({
        success: false,
        error: 'Withdrawal request not found or already processed'
      }, { status: 404 });
    }

    // Update the withdrawal with the real transaction hash
    await prisma.transaction.update({
      where: { id },
      data: {
        transactionHash,
        processedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        withdrawalId: id,
        transactionHash
      }
    });

  } catch (error) {
    console.error('Error executing withdrawal:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to execute withdrawal'
    }, { status: 500 });
  }
}