

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { withAuth } from "@/lib/auth";
import { updateStatusPageSchema } from "@/lib/schemas/StatusPage";


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
          userId: user.id,
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
          updatedAt: statusPage.createdAt.toISOString(), 
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



export const PATCH = withAuth(async (
    req: NextRequest,
    user,
    session,
    { params }: { params: Promise<{ customid: string }> }
  ) => {
    try {
      const { customid } = await params;
      const body = await req.json();
  
      if (!customid) {
        return NextResponse.json(
          { error: "Custom Page ID is required" },
          { status: 400 }
        );
      }
  
      const validation = updateStatusPageSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: validation.error.message },
          { status: 400 }
        );
      }
  
      const { name, logoUrl, logo, supportUrl, announcement, isPublished } = validation.data;
  
      const existingStatusPage = await prisma.statusPage.findFirst({
        where: {
          id: customid,
          userId: user.id,
        },
      });
  
      if (!existingStatusPage) {
        return NextResponse.json(
          { error: "Status Page not found" },
          { status: 404 }
        );
      }
  
      const updatedStatusPage = await prisma.statusPage.update({
        where: {
          id: customid,
        },
        data: {
          name,
          logoUrl,
          logo,
          supportUrl,
          announcement,
          isPublished,
        },
      });
  
      return NextResponse.json(
        {
          message: "Status Page updated successfully",
          statusPage: {
            id: updatedStatusPage.id,
            name: updatedStatusPage.name,
            logoUrl: updatedStatusPage.logoUrl,
            logo: updatedStatusPage.logo,
            supportUrl: updatedStatusPage.supportUrl,
            announcement: updatedStatusPage.announcement,
            isPublished: updatedStatusPage.isPublished,
            createdAt: updatedStatusPage.createdAt,
          },
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error updating status page:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
  
  






export const DELETE = withAuth(async (
    req: NextRequest,
    user,
    session,
    { params }: { params: Promise<{ customid: string }> }
  ) => {
    try {
      const { customid } = await params;
  
      if (!customid) {
        return NextResponse.json(
          { error: "Custom Page ID is required" },
          { status: 400 }
        );
      }
  
      const statusPage = await prisma.statusPage.findFirst({
            where: {
          id: customid,
          userId: user.id,
        },
      });
  
      if (!statusPage) {
        return NextResponse.json(
          { error: "Status Page not found" },
          { status: 404 }
        );
      }
  
      await prisma.statusPage.delete({
        where: {
          id: customid,
        },
      });

      return NextResponse.json(
        { message: "Status Page deleted successfully" },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error deleting status page:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  });
  