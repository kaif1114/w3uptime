import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';


const NonceRequestSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format')
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = NonceRequestSchema.parse(body);
    const { walletAddress } = validatedData;

    const normalizedAddress = walletAddress.toLowerCase();

    const nonce = uuidv7();
    const nonceExpiry = new Date(Date.now() + 10 * 60 * 1000); 


    let user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress }
    });

    if (user) {
   
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          nonce,
          nonceExpiry,
          updatedAt: new Date()
        }
      });
    } else {

      user = await prisma.user.create({
        data: {
          walletAddress: normalizedAddress,
          nonce,
          nonceExpiry,
        }
      });
    }

    return NextResponse.json({
      success: true,
      nonce,
      message: 'Nonce generated successfully.'
    });

  } catch (error) {
    console.error('Error generating nonce:', error);


    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid wallet address format',
        details: error.message
      }, { status: 400 });
    }


    if (error instanceof Error) {
      return NextResponse.json({
        success: false,
        error: 'Database error occurred',
        message: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
