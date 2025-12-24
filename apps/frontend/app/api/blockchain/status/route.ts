import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainListenerStatus, startBlockchainListener, stopBlockchainListener } from '@/lib/BlockchainListener';

export async function GET(request: NextRequest) {
  try {
    const status = getBlockchainListenerStatus();
    
    return NextResponse.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting blockchain listener status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get blockchain listener status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'start') {
      const listener = startBlockchainListener();
      return NextResponse.json({
        success: true,
        message: 'Blockchain listener started',
        data: listener.getStatus()
      });
    } else if (action === 'stop') {
      stopBlockchainListener();
      return NextResponse.json({
        success: true,
        message: 'Blockchain listener stopped'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Use "start" or "stop"'
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error controlling blockchain listener:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to control blockchain listener'
    }, { status: 500 });
  }
}