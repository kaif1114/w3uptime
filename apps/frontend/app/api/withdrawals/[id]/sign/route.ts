import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { ethers } from 'ethers';
import { generateNonce, getWithdrawalExpiry } from 'common/contract';

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

    // Check if user still has sufficient balance
    const amountInternalUnits = Math.floor(Number(BigInt(withdrawal.amount)) / Math.pow(10, 15)); // Convert from wei to internal units
    if (session.user.balance < amountInternalUnits) {
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
      [session.user.walletAddress, withdrawal.amount, nonce, expiry]
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
        userAddress: session.user.walletAddress
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