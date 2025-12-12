import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { withAuth } from '@/lib/auth';

const DepositEventSchema = z.object({
  fromAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  amount: z.string().min(1, 'Amount is required'),
  timestamp: z.string().min(1, 'Timestamp is required'),
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format'),
  blockNumber: z.number().int().positive('Block number must be positive')
});

export const GET = withAuth(async (request: NextRequest, user) => {
  try {

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = (page - 1) * limit;

    const deposits = await prisma.transaction.findMany({
      where: {
        type: 'DEPOSIT',
        fromAddress: {
          equals: user.walletAddress,
          mode: 'insensitive'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
      select: {
        id: true,
        fromAddress: true,
        amount: true,
        transactionHash: true,
        blockNumber: true,
        status: true,
        createdAt: true
      }
    });

    const totalCount = await prisma.transaction.count({
      where: {
        type: 'DEPOSIT',
        fromAddress: {
          equals: user.walletAddress,
          mode: 'insensitive'
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        deposits,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        },
        userBalance: 0 
      }
    });

  } catch (error) {
    console.error('Error fetching deposit history:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch deposit history'
    }, { status: 500 });
  }
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = DepositEventSchema.parse(body);
    const { fromAddress, amount, timestamp, transactionHash, blockNumber } = validatedData;

    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ') || authHeader.split(' ')[1] !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const normalizedAddress = fromAddress.toLowerCase();

    const existingTransaction = await prisma.transaction.findUnique({
      where: { transactionHash }
    });

    if (existingTransaction) {
      return NextResponse.json({
        success: true,
        message: 'Transaction already processed'
      });
    }

    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress }
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress: normalizedAddress,
          balance: 0,
          type: 'USER'
        }
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          type: 'DEPOSIT',
          fromAddress: normalizedAddress,
          amount,
          transactionHash,
          blockNumber,
          status: 'CONFIRMED',
          createdAt: new Date(parseInt(timestamp) * 1000),
          processedAt: new Date(),
          userId: user!.id
        }
      });

      const amountWei = BigInt(amount);
      const amountDecimal = new Prisma.Decimal(amountWei.toString());

      await tx.user.update({
        where: { walletAddress: normalizedAddress },
        data: {
          balance: {
            increment: amountDecimal
          }
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Deposit processed successfully'
    });

  } catch (error) {
    console.error('Error processing deposit:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
        details: error.issues
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Failed to process deposit'
    }, { status: 500 });
  }
}