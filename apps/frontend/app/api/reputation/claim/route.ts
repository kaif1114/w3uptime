import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { ethers } from 'ethers';
import { generateNonce, getWithdrawalExpiry } from 'common/contract';
import { withAuth } from '@/lib/auth';
import { getReputation } from '../../proposals/ReputationGuard';

// Rate limiting using in-memory cache (for production, use Redis)
const claimAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_CLAIMS_PER_HOUR = 3;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

function checkRateLimit(userId: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now();
  const userAttempts = claimAttempts.get(userId);

  if (!userAttempts || now > userAttempts.resetAt) {
    claimAttempts.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (userAttempts.count >= MAX_CLAIMS_PER_HOUR) {
    return { allowed: false, resetIn: userAttempts.resetAt - now };
  }

  userAttempts.count++;
  return { allowed: true };
}

export const POST = withAuth(async (_request: NextRequest, user) => {
  try {
    // 1. Rate limiting check
    // const rateLimitResult = checkRateLimit(user.id);
    // if (!rateLimitResult.allowed) {
    //   const minutesLeft = Math.ceil((rateLimitResult.resetIn || 0) / 60000);
    //   return NextResponse.json({
    //     success: false,
    //     error: `Too many claim attempts. Try again in ${minutesLeft} minutes.`
    //   }, { status: 429 });
    // }

    // 2. Fetch user with current reputation tracking
    const userWithReputation = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        walletAddress: true,
        claimedReputation: true
      }
    });

    if (!userWithReputation) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      }, { status: 404 });
    }

    // 3. Calculate unclaimed amount using getReputation as single source of truth
    const reputation = await getReputation(user.id);
    const totalReputation = reputation.totalScore;
    const claimedReputation = userWithReputation.claimedReputation || 0;
    const unclaimedAmount = Math.max(0, totalReputation - claimedReputation);

    if (unclaimedAmount <= 0) {
      return NextResponse.json({
        success: false,
        error: 'No unclaimed reputation available',
        data: {
          totalReputation,
          claimedReputation,
          unclaimedAmount: 0
        }
      }, { status: 400 });
    }

    // Additional safety check for suspiciously large claims
    if (unclaimedAmount > 100000) {
      console.error('Suspiciously large claim detected:', {
        userId: user.id,
        walletAddress: userWithReputation.walletAddress,
        unclaimedAmount,
        totalReputation,
        claimedReputation,
        breakdown: reputation
      });
      return NextResponse.json({
        success: false,
        error: 'Claim amount too large - please contact support'
      }, { status: 400 });
    }

    // 4. Verify authorized signer is configured
    const authorizedSignerKey = process.env.AUTHORIZED_SIGNER_KEY;
    if (!authorizedSignerKey) {
      console.error('AUTHORIZED_SIGNER_KEY not configured');
      return NextResponse.json({
        success: false,
        error: 'Server configuration error'
      }, { status: 500 });
    }

    // 5. Generate nonce and expiry (15 minutes validity)
    const nonce = generateNonce();
    const expiry = getWithdrawalExpiry(15);

    // 6. Create message hash matching contract's getReputationMessageHash format
    const messageHash = ethers.solidityPackedKeccak256(
      ['address', 'uint256', 'uint256', 'uint256'],
      [userWithReputation.walletAddress, unclaimedAmount, nonce, expiry]
    );

    // 7. Sign the message with platform signer
    const wallet = new ethers.Wallet(authorizedSignerKey);
    const signature = await wallet.signMessage(ethers.getBytes(messageHash));

    // 8. Return signature data for user to submit on-chain
    return NextResponse.json({
      success: true,
      data: {
        signature,
        nonce: nonce.toString(),
        expiry: expiry.toString(),
        amount: unclaimedAmount,
        userAddress: userWithReputation.walletAddress,
        breakdown: reputation
      }
    });

  } catch (error) {
    console.error('Error generating reputation claim signature:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to generate claim signature'
    }, { status: 500 });
  }
});
