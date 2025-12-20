import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const HUB_SERVER_URL = process.env.HUB_SERVER_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionId = cookieStore.get('sessionId')?.value;

    if (!sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString();
    
    
    const hubResponse = await fetch(`${HUB_SERVER_URL}/validators${queryString ? `?${queryString}` : ''}`, {
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
        { error: 'Failed to fetch validators from hub server' }, 
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