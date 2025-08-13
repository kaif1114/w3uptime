import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function clearDatabase() {
  await prisma.escalationLog.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.monitorTick.deleteMany();
  await prisma.session.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.postmortem.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.monitor.deleteMany();
  await prisma.escalationLevel.deleteMany();
  await prisma.escalationPolicy.deleteMany();
  await prisma.user.deleteMany();
}

async function seed() {
  console.log("Seeding database...");

  await clearDatabase();

  // Users
  const standardUser = await prisma.user.create({
    data: {
      walletAddress: "0x1111111111111111111111111111111111111111",
      type: "USER",
      balance: 0,
      ip: "127.0.0.1",
    },
  });

  const validatorOne = await prisma.user.create({
    data: {
      walletAddress: "0x2222222222222222222222222222222222222222",
      type: "VALIDATOR",
      balance: 100,
      ip: "203.0.113.10",
    },
  });

  const validatorTwo = await prisma.user.create({
    data: {
      walletAddress: "0x3333333333333333333333333333333333333333",
      type: "VALIDATOR",
      balance: 250,
      ip: "198.51.100.27",
    },
  });

  // Escalation policy with levels
  const policy = await prisma.escalationPolicy.create({
    data: {
      name: "Default Policy",
      enabled: true,
      levels: {
        create: [
          {
            levelOrder: 1,
            waitMinutes: 5,
            contacts: ["alerts@example.com"],
            channel: "EMAIL",
            name: "Primary Email",
            message: "Service issue detected",
          },
          {
            levelOrder: 2,
            waitMinutes: 15,
            contacts: [
              "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
            ],
            channel: "SLACK",
            name: "Slack Escalation",
            message: "Escalating incident",
          },
        ],
      },
    },
    include: { levels: true },
  });

  // Monitors
  const monitorA = await prisma.monitor.create({
    data: {
      name: "Google",
      url: "https://www.google.com",
      userId: standardUser.id,
      checkInterval: 60,
      expectedStatusCodes: [200, 204],
      status: "ACTIVE",
      timeout: 15,
      escalationPolicyId: policy.id,
    },
  });

  const monitorB = await prisma.monitor.create({
    data: {
      name: "Youtube",
      url: "https://www.youtube.com",
      userId: standardUser.id,
      checkInterval: 120,
      expectedStatusCodes: [200],
      status: "ACTIVE",
      timeout: 20,
      escalationPolicyId: policy.id,
    },
  });

  // Monitor ticks by validators
  await prisma.monitorTick.create({
    data: {
      monitorId: monitorA.id,
      userId: validatorOne.id,
      status: "GOOD",
      latency: 123.45,
    },
  });

  await prisma.monitorTick.create({
    data: {
      monitorId: monitorA.id,
      userId: validatorTwo.id,
      status: "BAD",
      latency: 850.12,
    },
  });

  await prisma.monitorTick.create({
    data: {
      monitorId: monitorB.id,
      userId: validatorOne.id,
      status: "GOOD",
      latency: 210.33,
    },
  });

  // Alert and escalation logs for monitor A
  const alert = await prisma.alert.create({
    data: {
      severity: "HIGH",
      title: "Service Down",
      message: "Received 500 from health endpoint",
      triggerStatusCode: 500,
      expectedStatusCode: 200,
      status: "SENT",
      monitorId: monitorA.id,
    },
  });

  await prisma.escalationLog.create({
    data: {
      id: "elog-1",
      alertId: alert.id,
      levelOrder: 1,
      levelName: "Primary Email",
      sentTo: ["alerts@example.com"],
      channel: "EMAIL",
      wasAcknowledged: false,
    },
  });

  // Incident, comment, and postmortem for monitor A
  const incident = await prisma.incident.create({
    data: {
      title: "Partial outage",
      description: "Homepage health check failing intermittently",
      severity: "MAJOR",
      status: "INVESTIGATING",
      monitorId: monitorA.id,
      escalated: true,
    },
  });

  await prisma.comment.create({
    data: {
      description: "Investigating increased error rates",
      incidentId: incident.id,
      userId: standardUser.id,
    },
  });

  const postmortem = await prisma.postmortem.create({
    data: {
      resolutionTime: 35,
      rootCause: "Database connection pool exhaustion",
      resolution: "Increased pool size and added circuit breaker",
      incidentId: incident.id,
    },
  });

  // Back-reference postmortem on incident (optional linking field)
  await prisma.incident.update({
    where: { id: incident.id },
    data: { postmortemId: postmortem.id, status: "RESOLVED", resolvedAt: new Date() },
  });

  // Seed session for the standard user
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      userId: standardUser.id,
      sessionId: "seed-session-0001",
      walletAddress: standardUser.walletAddress || "",
      userAgent: "seed-script",
      ipAddress: "127.0.0.1",
      expiresAt,
    },
  });

  console.log("Seed completed ✅");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


