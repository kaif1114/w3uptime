import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const createMaintenanceSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string(),
	from: z.string().refine((val) => {
		
		const datetimeLocalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
		const isDatetimeLocal = datetimeLocalRegex.test(val);
		const isValidDate = !isNaN(new Date(val).getTime());
		return isDatetimeLocal || isValidDate;
	}, "Invalid datetime format"),
	to: z.string().refine((val) => {
		
		const datetimeLocalRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
		const isDatetimeLocal = datetimeLocalRegex.test(val);
		const isValidDate = !isNaN(new Date(val).getTime());
		return isDatetimeLocal || isValidDate;
	}, "Invalid datetime format"),
});


export const GET = withAuth(async (
	req: NextRequest,
	user,
	session,
	{ params }: { params: Promise<{ customid: string }> }
) => {
	try {
		const { customid } = await params;

		
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

		
		const maintenances = await prisma.maintenance.findMany({
			where: { statusPageId: customid },
			orderBy: { from: 'desc' },
		});

		
		const formattedMaintenances = maintenances.map(maintenance => ({
			id: maintenance.id,
			title: maintenance.title,
			description: maintenance.description,
			start: maintenance.from.toISOString(),
			end: maintenance.to.toISOString(),
			status: "scheduled" as const, 
		}));

		return NextResponse.json({
			maintenances: formattedMaintenances,
		});
	} catch (error) {
		console.error("Error fetching maintenances:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
});

export const POST = withAuth(async (
	req: NextRequest,
	user,
	session,
	{ params }: { params: Promise<{ customid: string }> }
) => {
	try {
		const { customid } = await params;
		const body = await req.json();
		const validation = createMaintenanceSchema.safeParse(body);

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

		const { title, description, from, to } = validation.data;

		const maintenance = await prisma.maintenance.create({
			data: {
				title,
				description,
				from: new Date(from),
				to: new Date(to),
				statusPageId: statusPage.id,
			},
		});

		
		const formattedMaintenance = {
			id: maintenance.id,
			title: maintenance.title,
			description: maintenance.description,
			start: maintenance.from.toISOString(),
			end: maintenance.to.toISOString(),
			status: "scheduled" as const,
		};

		return NextResponse.json(
			{
				message: "Maintenance created successfully",
				maintenance: formattedMaintenance,
			},
			{ status: 201 }
		);
	} catch (error) {
		console.error("Error creating maintenance:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
});


