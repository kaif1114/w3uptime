import { NextRequest, NextResponse } from 'next/server';
import { prisma } from 'db/client';
import { ethers } from 'ethers';
import { v7 as uuidv7 } from 'uuid';
import { z } from 'zod';


const VerifyRequestSchema = z.object({
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format'),
  signature: z.string().min(1, 'Signature is required')
});



export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = VerifyRequestSchema.parse(body);
    const { walletAddress, signature } = validatedData;

    const normalizedAddress = walletAddress.toLowerCase();

    
    const user = await prisma.user.findUnique({
      where: { walletAddress: normalizedAddress }
    });

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'User not found. Please request a new nonce first.'
      }, { status: 404 });
    }

    
    if (!user.nonce || !user.nonceExpiry || new Date() > user.nonceExpiry) {
      return NextResponse.json({
        success: false,
        error: 'No valid nonce found or expired. Please request a new nonce.'
      }, { status: 400 });
    }


    try {
      const noance = user.nonce;
      const recoveredAddress = ethers.verifyMessage(noance, signature);
      
      if (recoveredAddress.toLowerCase() !== normalizedAddress) {
        return NextResponse.json({
          success: false,
          error: 'Signature verification failed. The signature does not match the wallet address.'
        }, { status: 401 });
      }
    } catch (error) {
      console.error('Signature verification error:', error);
      return NextResponse.json({
        success: false,
        error: 'Invalid signature format or verification failed.'
      }, { status: 400 });
    }

    const sessionId = uuidv7();
    const expiresAt = new Date(Date.now() + Number(process.env.SESSION_EXPIRY_DAYS || 7) * 24 * 60 * 60 * 1000);
    
    
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwarded?.split(',')[0] || realIp || 'Unknown';

    
       await prisma.session.create({
       data: {
         sessionId,
         userId: user.id,
         walletAddress: user.walletAddress!, 
         expiresAt,
         userAgent,
         ipAddress
       }
     });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        nonce: null,
        nonceExpiry: null,
        updatedAt: new Date()
      }
    });

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful',
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt
      }
    });

    response.cookies.set('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: Number(process.env.SESSION_EXPIRY_DAYS || 7) * 24 * 60 * 60, 
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Error verifying signature:', error);


    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request data',
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
