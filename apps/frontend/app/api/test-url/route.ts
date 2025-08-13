import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";

// GET /api/test-url - Test if a URL is reachable
export const GET = withAuth(async (req: NextRequest, user) => {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { error: "URL parameter is required" },
        { status: 400 }
      );
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Test the URL
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'W3Uptime-Monitor/1.0'
        }
      });

      clearTimeout(timeoutId);

      return NextResponse.json({
        status: response.status,
        statusText: response.statusText,
        reachable: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });

    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: "Request timeout - URL took too long to respond" },
          { status: 408 }
        );
      }

      return NextResponse.json(
        { 
          error: "URL is not reachable",
          details: fetchError.message 
        },
        { status: 503 }
      );
    }

  } catch (error) {
    console.error("Error testing URL:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
});
