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
    const incident = await prisma.incident.create({
      data: {
        title,
        monitorId,
        createdAt: time,
        cause: "URL_UNAVAILABLE",
      },
    });

    await prisma.timelineEvent.create({
      data: {
        description: `Incident reported: ${title}`,
        incidentId: incident.id,
        type: "INCIDENT",
        createdAt: time,
      },
    });
  } catch (error) {
    console.error("Error creating incident:", error);
  }
}

export async function resolveIncident(monitorId: string, time: Date) {
    try {
        const incident = await prisma.incident.findFirst({
            where: {
                monitorId,
                cause: "URL_UNAVAILABLE",
                status: {
                    in: ["ONGOING", "ACKNOWLEDGED"]
                }
            },
        })
        if(incident) {
            await prisma.incident.update({
                where: { id: incident.id },
                data: { status: "RESOLVED", resolvedAt: time }
            })

            await prisma.timelineEvent.create({
                data: {
                    description: `Incident resolved: ${incident.title}`,
                    incidentId: incident.id,
                    type: "RESOLUTION",
                    createdAt: time,
                },
            });
        }
    } catch (error) {
        console.error("Error resolving incident:", error);
    }
}