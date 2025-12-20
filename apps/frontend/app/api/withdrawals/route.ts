import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { z } from 'zod';
import { ethers } from 'ethers';
import { withAuth } from '@/lib/auth';

const WithdrawalRequestSchema = z.object({
  amount: z.string().min(1, 'Amount is required'),
});

export const GET = withAuth(async (request: NextRequest, user) => {
  try {

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = (page - 1) * limit;

    const withdrawals = await prisma.transaction.findMany({
      where: {
        type: 'WITHDRAWAL',
        userId: user.id
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
        userId: user.id
      }
    });

    const userBalance = await prisma.user.findUnique({
      where: { id: user.id },
      select: { balance: true }
    });

    
    const formattedWithdrawals = withdrawals.map(withdrawal => {
      const amountWei = BigInt(withdrawal.amount);
      const amountEth = parseFloat(ethers.formatEther(amountWei));

      return {
        id: withdrawal.id,
        amount: amountEth,
        status: withdrawal.status.toLowerCase() as 'pending' | 'completed' | 'failed',
        requestedAt: withdrawal.createdAt.toISOString(),
        processedAt: withdrawal.processedAt?.toISOString(),
        transactionHash: withdrawal.transactionHash?.startsWith('pending_') ? undefined : withdrawal.transactionHash
      };
    });

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
        userBalance: userBalance ? parseFloat(ethers.formatEther(BigInt(userBalance.balance.toString()))) : 0
      }
    });

  } catch (error) {
    console.error('Error fetching withdrawal history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch withdrawal history'
    }, { status: 500 });
  }
});

export const POST = withAuth(async (request: NextRequest, user) => {
  try {
    
    const userWithBalance = await prisma.user.findUnique({
      where: { id: user.id },
      select: { balance: true, walletAddress: true }
    });

    if (!userWithBalance) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const body = await request.json();
    const { amount } = WithdrawalRequestSchema.parse(body);
    
    let amountWei: bigint;
    try {
      amountWei = ethers.parseEther(amount);
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Invalid amount format'
      }, { status: 400 });
    }

    
    if (amountWei <= 0) {
      return NextResponse.json({
        success: false,
        error: 'Amount must be greater than 0'
      }, { status: 400 });
    }

    
    if (BigInt(userWithBalance.balance.toString()) < amountWei) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient balance'
      }, { status: 400 });
    }

    
    const tempTxHash = `pending_${user.id}_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const withdrawal = await prisma.transaction.create({
      data: {
        type: 'WITHDRAWAL',
        toAddress: userWithBalance.walletAddress,
        amount: amountWei.toString(),
        transactionHash: tempTxHash, 
        blockNumber: 0, 
        status: 'PENDING',
        userId: user.id
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        withdrawalId: withdrawal.id,
          amount: parseFloat(ethers.formatEther(amountWei)),
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Error creating withdrawal request:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.message
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to create withdrawal request'
    }, { status: 500 });
  }
});