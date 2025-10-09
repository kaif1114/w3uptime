import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const HUB_SERVER_URL = process.env.HUB_SERVER_URL || 'http://localhost:8080';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    const hubResponse = await fetch(`${HUB_SERVER_URL}/validators/count`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sessionId=${sessionId}`
      },
    });

    if (!hubResponse.ok) {
      const errorText = await hubResponse.text();
      console.error('Hub server error:', errorText);
      return NextResponse.json(
        { error: 'Failed to fetch validator count from hub server' }, 
        { status: hubResponse.status }
      );
    }

    const data = await hubResponse.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}