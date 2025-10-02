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

export const POST = withAuth(async (request: NextRequest, user, session, { params }: RouteParams) => {
  try {
    // Get user with balance and wallet address
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

    // Find the withdrawal request
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

    // Check if user still has sufficient balance
    const amountInternalUnits = Math.floor(Number(BigInt(withdrawal.amount)) / Math.pow(10, 15)); // Convert from wei to internal units
    if (userWithBalance.balance < amountInternalUnits) {
      return NextResponse.json({
        success: false,
        error: 'Insufficient balance'
      }, { status: 400 });
    }

    // Get authorized signer private key
    const authorizedSignerKey = process.env.AUTHORIZED_SIGNER_KEY;
    if (!authorizedSignerKey) {
      console.error('AUTHORIZED_SIGNER_KEY not configured');
      return NextResponse.json({
        success: false,
        error: 'Server configuration error'
      }, { status: 500 });
    }

    // Generate nonce and expiry
    const nonce = generateNonce();
    const expiry = getWithdrawalExpiry(15); // 15 minutes from now

    // Create message hash
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256', 'uint256'],
      [userWithBalance.walletAddress, withdrawal.amount, nonce, expiry]
    );

    // Sign the message
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
}