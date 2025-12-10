import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { ethers } from 'ethers';
import { generateNonce, getWithdrawalExpiry } from 'common/contract';
import { withAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

export const POST = withAuth(async (_request: NextRequest, user, _session, { params }: RouteParams) => {
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

    const { id } = await params;

    
    const withdrawal = await prisma.transaction.findFirst({
      where: {
        id,
        type: 'WITHDRAWAL',
        userId: user.id,
        status: 'PENDING'
      }
    });

    if (!withdrawal) {
      return NextResponse.json({
        success: false,
        error: 'Withdrawal request not found or already processed'
      }, { status: 404 });
    }

    
    const amountWei = BigInt(withdrawal.amount.toString());
    if (BigInt(userWithBalance.balance.toString()) < amountWei) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient balance'
      }, { status: 400 });
    }

    
    const authorizedSignerKey = process.env.AUTHORIZED_SIGNER_KEY;
    if (!authorizedSignerKey) {
      console.error('AUTHORIZED_SIGNER_KEY not configured');
      return NextResponse.json({
        success: false,
        error: 'Server configuration error'
      }, { status: 500 });
    }

    
    const nonce = generateNonce();
    const expiry = getWithdrawalExpiry(15); 

    
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256', 'uint256'],
      [userWithBalance.walletAddress, withdrawal.amount, nonce, expiry]
    );

    
    const wallet = new ethers.Wallet(authorizedSignerKey);
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    return NextResponse.json({
      success: true,
      data: {
        signature,
        nonce: nonce.toString(),
        expiry: expiry.toString(),
        amount: withdrawal.amount,
        userAddress: userWithBalance.walletAddress
      }
    });

  } catch (error) {
    console.error('Error generating withdrawal signature:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate withdrawal signature'
    }, { status: 500 });
  }
});