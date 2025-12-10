import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { ethers } from 'ethers';
import { withAuth } from '@/lib/auth';
import { computeReputationScore } from 'hub/src/services/reputation';
export const GET = withAuth(async (_request: NextRequest, user) => {
  try {
    const userId = user.id;
    
    const userWithBalance = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        balance: true,
        goodTicks: true,
        badTicks: true,
      }
    });

    if (!userWithBalance) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    const userBalance = BigInt(userWithBalance.balance.toString()); 

    
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

    
    const totalDepositsEth = parseFloat(ethers.formatEther(confirmedDeposits));
    const pendingWithdrawalsEth = parseFloat(ethers.formatEther(pendingWithdrawalAmount));
    const availableBalanceEth = parseFloat(ethers.formatEther(userBalance)); 

    const totalEarnings = totalDepositsEth;
    const reputationScore = computeReputationScore(
      {
        goodTicks: userWithBalance.goodTicks,
        badTicks: userWithBalance.badTicks
      }
    );
    
    const recentTransactions = allTransactions.slice(0, 5).map(tx => {
      const amt = BigInt(tx.amount);
      return {
        id: tx.id,
        type: tx.type === 'DEPOSIT' ? 'earnings' as const : 'withdrawal' as const,
        amount: tx.type === 'DEPOSIT' 
          ? parseFloat(ethers.formatEther(amt))
          : -parseFloat(ethers.formatEther(amt)),
        status: tx.status.toLowerCase() as 'completed' | 'pending' | 'failed',
        date: tx.createdAt.toISOString(),
        description: tx.type === 'DEPOSIT' 
          ? 'Validator earnings deposit'
          : 'Withdrawal to wallet',
        transactionHash: tx.transactionHash?.startsWith('pending_') ? undefined : tx.transactionHash
      };
    });

    
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
      reputation: {
        score: reputationScore,
        goodTicks: userWithBalance.goodTicks,
        badTicks: userWithBalance.badTicks,
      },
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