import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { ethers } from 'ethers';
import { withAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export const GET = withAuth(async (request: NextRequest, user, session, { params }: RouteParams) => {
  try {

    const { id } = await params;

    const withdrawal = await prisma.transaction.findFirst({
      where: {
        id,
        type: 'WITHDRAWAL',
        userId: user.id
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

    const formattedWithdrawal = {
      id: withdrawal.id,
      amount: parseFloat(ethers.formatEther(BigInt(withdrawal.amount))), 
      status: withdrawal.status.toLowerCase() as 'pending' | 'completed' | 'failed',
      requestedAt: withdrawal.createdAt.toISOString(),
      processedAt: withdrawal.processedAt?.toISOString(),
      transactionHash: withdrawal.transactionHash?.startsWith('pending_') ? undefined : withdrawal.transactionHash
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
});