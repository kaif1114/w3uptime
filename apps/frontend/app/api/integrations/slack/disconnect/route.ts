import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { prisma } from 'db/client';
import { z } from 'zod';

const disconnectSchema = z.object({
  integrationId: z.string().uuid()
});

export async function POST(request: NextRequest) {
  try {
    // Authenticate the user
    const authResult = await authenticateRequest(request);
    
    if (!authResult.authenticated || !authResult.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = disconnectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request data', details: validation.error.message },
        { status: 400 }
      );
    }

    const { integrationId } = validation.data;

    // Find and verify ownership of the integration
    const integration = await prisma.slackIntegration.findFirst({
      where: {
        id: integrationId,
        userId: authResult.user.id
      }
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }

    // Soft delete the integration (mark as inactive)
    await prisma.slackIntegration.update({
      where: { id: integrationId },
      data: {
        isActive: false,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Slack integration disconnected successfully'
    });

  } catch (error) {
    console.error('Error disconnecting Slack integration:', error);
    return NextResponse.json(
      { error: 'Failed to disconnect Slack integration' },
      { status: 500 }
    );
  }
}
