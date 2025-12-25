
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";
import { createStatusPageSchema } from "@/lib/schemas/StatusPage";

  
  export const POST = withAuth(async (req: NextRequest, user) => {
    
    try { 
      const body = await req.json();
      const validation = createStatusPageSchema.safeParse(body);
  
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }
  
      const { name, logoUrl, logo, supportUrl, announcement, isPublished } = validation.data;
  
        const statusPage = await prisma.statusPage.create({
        data:{
            userId:user.id,
            name,
            logoUrl,
            logo,
            supportUrl,
            announcement,
            isPublished,
        }
      });
  
      return NextResponse.json(
        {
          message: "Status Page created successfully",
          statusPage: {
            id: statusPage.id,
            name: statusPage.name,
            logoUrl: statusPage.logoUrl,
            logo: statusPage.logo,
            supportUrl: statusPage.supportUrl,
            announcement: statusPage.announcement,
            isPublished: statusPage.isPublished,
          },
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Error creating status page:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });



