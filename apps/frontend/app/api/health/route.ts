import { NextRequest, NextResponse } from 'next/server';
import { getBlockchainListenerStatus } from '@/lib/BlockchainListener';

export async function GET(request: NextRequest) {
  try {
    const status = getBlockchainListenerStatus();

    return NextResponse.json({
      success: true,
      message: 'W3Uptime API is healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'operational', 
        blockchainListener: status.isListening ? 'operational' : 'stopped',
        blockchainStatus: status
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}