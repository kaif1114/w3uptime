import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";

export async function GET(req: NextRequest) {
  try {
    // Test database connection
    await prisma.$connect();

    // Try a simple query
    const userCount = await prisma.user.count();

    return NextResponse.json({
      message: "Database connection successful",
      userCount,
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      {
        error: "Database connection failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
