import { NextRequest, NextResponse } from "next/server";
import { prisma } from "db/client";
import { z } from "zod";
import { withAuth } from "@/lib/auth";

const createMaintenanceSchema = z.object({
	title: z.string().min(1, "Title is required"),
	description: z.string(),
	from: z.string().datetime("Invalid ISO datetime"),
	to: z.string().datetime("Invalid ISO datetime"),
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

		return NextResponse.json(
			{
				message: "Maintenance created successfully",
				maintenance,
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

// https://uptime.betterstack.com/team/t344919/status-pages/223815/maintenances/new this is the route which it will hit
// https://uptime.betterstack.com/team/t344919/status-pages/223815/maintenances/new this is the route which it will hit