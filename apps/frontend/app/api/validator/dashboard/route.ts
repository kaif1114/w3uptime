import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { withAuth } from '@/lib/auth';

export const GET = withAuth(async (_request: NextRequest, user) => {
  try {
    const userId = user.id;
    
    
    const userWithBalance = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true }
    });

    if (!userWithBalance) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const userBalance = userWithBalance.balance; 

    
    const allTransactions = await prisma.transaction.findMany({
      where: {
        userId,
        status: 'CONFIRMED'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    
    const confirmedDeposits = allTransactions
      .filter(tx => tx.type === 'DEPOSIT')
      .reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0));

    
    const pendingWithdrawals = await prisma.transaction.findMany({
      where: {
        userId,
        type: 'WITHDRAWAL',
        status: 'PENDING'
      }
    });

    const pendingWithdrawalAmount = pendingWithdrawals
      .reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0));

    
    const totalDepositsEth = Number(confirmedDeposits) / Math.pow(10, 18);
    const pendingWithdrawalsEth = Number(pendingWithdrawalAmount) / Math.pow(10, 18);
    const availableBalanceEth = userBalance / 1000; 

    
    
    const totalEarnings = totalDepositsEth;

    
    const recentTransactions = allTransactions.slice(0, 5).map(tx => ({
      id: tx.id,
      type: tx.type === 'DEPOSIT' ? 'earnings' as const : 'withdrawal' as const,
      amount: tx.type === 'DEPOSIT' 
        ? Number(BigInt(tx.amount)) / Math.pow(10, 18)
        : -(Number(BigInt(tx.amount)) / Math.pow(10, 18)),
      status: tx.status.toLowerCase() as 'completed' | 'pending' | 'failed',
      date: tx.createdAt.toISOString(),
      description: tx.type === 'DEPOSIT' 
        ? 'Validator earnings deposit'
        : 'Withdrawal to wallet',
      transactionHash: tx.transactionHash?.startsWith('pending_') ? undefined : tx.transactionHash
    }));

    
    const validationSummary = {
      totalValidations: 0,
      successfulValidations: 0,
      failedValidations: 0,
      successRate: 0,
      lastValidationDate: new Date().toISOString()
    };

    const dashboardData = {
      balance: {
        totalEarnings,
        availableBalance: availableBalanceEth,
        pendingWithdrawals: pendingWithdrawalsEth,
        currency: 'ETH'
      },
      validationSummary,
      recentTransactions
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('Error fetching validator dashboard data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data'
    }, { status: 500 });
  }
});