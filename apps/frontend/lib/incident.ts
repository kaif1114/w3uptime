import { prisma } from "db/client";

export async function createIncident(monitorId: string, title: string, time: Date) {
  try {
    const isExistingIncident = await prisma.incident.findFirst({
      where: {
        monitorId,
        cause: "URL_UNAVAILABLE",
        status: {
          in: ["ONGOING", "ACKNOWLEDGED"],
        },
      },
    });
    if (isExistingIncident) {
      return;
    }
    console.log('Creating incident...');
    await prisma.incident.create({
      data: {
        title,
        monitorId,
        createdAt: time,
        cause: "URL_UNAVAILABLE",
      },
    });
  } catch (error) {
    console.error("Error creating incident:", error);
  }
}
