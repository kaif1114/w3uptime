// ROUTE FOR GETTING A CUSTOM PAGE

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";


export const GET = withAuth(async (
    req: NextRequest,
    user,
    session,
    { params }: { params: Promise<{ customid: string }> }
  ) => {
    try {
      const { customid } = await params;
  
      const statusPage = await prisma.statusPage.findFirst({
        where: {
          id: customid,
        //   userId: user.id,
        },
      });
  
      if (!statusPage) {
        return NextResponse.json(
          { error: "Status Page not found" },
          { status: 404 }
        );
      }
  
      return NextResponse.json(
        {
          id: statusPage.id,
          name: statusPage.name,    
          logoUrl: statusPage.logoUrl,
          logo: statusPage.logo,
          supportUrl: statusPage.supportUrl,
          announcement: statusPage.announcement,
          isPublished: statusPage.isPublished,
          createdAt: statusPage.createdAt.toISOString(),
          updatedAt: statusPage.createdAt.toISOString(), // Use createdAt since updatedAt doesn't exist yet
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error fetching status page:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
  






// ROUTE FOR UPDATING A CUSTOM PAGE

// ROUTE FOR DELETING A CUSTOM PAGE


