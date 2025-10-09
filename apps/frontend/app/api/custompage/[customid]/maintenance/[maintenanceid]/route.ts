import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const updateMaintenanceSchema = z.object({
	title: z.string().min(1, "Title is required").optional(),
	description: z.string().optional(),
	from: z.string().refine((val) => {
		
		const datetimeLocalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
		const isDatetimeLocal = datetimeLocalRegex.test(val);
		const isValidDate = !isNaN(new Date(val).getTime());
		return isDatetimeLocal || isValidDate;
	}, "Invalid datetime format").optional(),
	to: z.string().refine((val) => {
		
		const datetimeLocalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
		const isDatetimeLocal = datetimeLocalRegex.test(val);
		const isValidDate = !isNaN(new Date(val).getTime());
		return isDatetimeLocal || isValidDate;
	}, "Invalid datetime format").optional(),
});


export const GET = withAuth(async (
	req: NextRequest,
	user,
	session,
	{ params }: { params: Promise<{ customid: string; maintenanceid: string }> }
) => {
	try {
		const { customid, maintenanceid } = await params;

		
		const statusPage = await prisma.statusPage.findFirst({
			where: { id: customid, userId: user.id },
			select: { id: true },
		});

		if (!statusPage) {
			return NextResponse.json(
				{ error: "Status Page not found" },
				{ status: 404 }
			);
		}

		
		const maintenance = await prisma.maintenance.findFirst({
			where: { 
				id: maintenanceid,
				statusPageId: customid,
			},
		});

		if (!maintenance) {
			return NextResponse.json(
				{ error: "Maintenance not found" },
				{ status: 404 }
			);
		}

		
		const formattedMaintenance = {
			id: maintenance.id,
			title: maintenance.title,
			description: maintenance.description,
			start: maintenance.from.toISOString(),
			end: maintenance.to.toISOString(),
			status: "scheduled" as const,
		};

		return NextResponse.json(formattedMaintenance);
	} catch (error) {
		console.error("Error fetching maintenance:", error);
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
	{ params }: { params: Promise<{ customid: string; maintenanceid: string }> }
) => {
	try {
		const { customid, maintenanceid } = await params;
		const body = await req.json();
		const validation = updateMaintenanceSchema.safeParse(body);

		if (!validation.success) {
			return NextResponse.json(
				{ error: validation.error.message },
				{ status: 400 }
			);
		}

		
		const statusPage = await prisma.statusPage.findFirst({
			where: { id: customid, userId: user.id },
			select: { id: true },
		});

		if (!statusPage) {
			return NextResponse.json(
				{ error: "Status Page not found" },
				{ status: 404 }
			);
		}

		
		const existingMaintenance = await prisma.maintenance.findFirst({
			where: { 
				id: maintenanceid,
				statusPageId: customid,
			},
		});

		if (!existingMaintenance) {
			return NextResponse.json(
				{ error: "Maintenance not found" },
				{ status: 404 }
			);
		}

		const updateData: Record<string, unknown> = {};
		if (validation.data.title !== undefined) updateData.title = validation.data.title;
		if (validation.data.description !== undefined) updateData.description = validation.data.description;
		if (validation.data.from !== undefined) updateData.from = new Date(validation.data.from);
		if (validation.data.to !== undefined) updateData.to = new Date(validation.data.to);

		const updatedMaintenance = await prisma.maintenance.update({
			where: { id: maintenanceid },
			data: updateData,
		});

		
		const formattedMaintenance = {
			id: updatedMaintenance.id,
			title: updatedMaintenance.title,
			description: updatedMaintenance.description,
			start: updatedMaintenance.from.toISOString(),
			end: updatedMaintenance.to.toISOString(),
			status: "scheduled" as const,
		};

		return NextResponse.json({
			message: "Maintenance updated successfully",
			maintenance: formattedMaintenance,
		});
	} catch (error) {
		console.error("Error updating maintenance:", error);
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
	{ params }: { params: Promise<{ customid: string; maintenanceid: string }> }
) => {
	try {
		const { customid, maintenanceid } = await params;

		
		const statusPage = await prisma.statusPage.findFirst({
			where: { id: customid, userId: user.id },
			select: { id: true },
		});

		if (!statusPage) {
			return NextResponse.json(
				{ error: "Status Page not found" },
				{ status: 404 }
			);
		}

		
		const existingMaintenance = await prisma.maintenance.findFirst({
			where: { 
				id: maintenanceid,
				statusPageId: customid,
			},
		});

		if (!existingMaintenance) {
			return NextResponse.json(
				{ error: "Maintenance not found" },
				{ status: 404 }
			);
		}

		
		await prisma.maintenance.delete({
			where: { id: maintenanceid },
		});

		return NextResponse.json({
			message: "Maintenance deleted successfully",
		});
	} catch (error) {
		console.error("Error deleting maintenance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
});

