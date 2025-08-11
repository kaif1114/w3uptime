import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Deterministic IDs for idempotent seeding
  const userId = '11111111-1111-4111-8111-111111111111'
  const monitorId1 = '22222222-2222-4222-8222-222222222222'
  const monitorId2 = '33333333-3333-4333-8333-333333333333'
  const validatorId1 = '44444444-4444-4444-8444-444444444444'
  const validatorId2 = '55555555-5555-4555-8555-555555555555'
  const escalationId = '66666666-6666-4666-8666-666666666666'
  const alertId = '77777777-7777-4777-8777-777777777777'
  const incidentId = '88888888-8888-4888-8888-888888888888'
  const commentId = '99999999-9999-4999-8999-999999999999'
  const postmortemId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
  const monitorTickId1 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
  const monitorTickId2 = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'

  // User
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
    },
  })

  // Monitors
  await prisma.monitor.upsert({
    where: { id: monitorId1 },
    update: {},
    create: {
      id: monitorId1,
      name: 'Main Website',
      url: 'https://google.com/health',
      userId,
      // using schema defaults for checkInterval/timeout/status/expectedStatusCodes
    },
  })

  await prisma.monitor.upsert({
    where: { id: monitorId2 },
    update: {},
    create: {
      id: monitorId2,
      name: 'API',
      url: 'https://youtube.com/status',
      userId,
    },
  })

  // Validators
  await prisma.validator.upsert({
    where: { id: validatorId1 },
    update: {
      publicKey: 'VAL1_PUBLIC_KEY',
      ip: '203.0.113.10',
      balance: 1000,
    },
    create: {
      id: validatorId1,
      publicKey: 'VAL1_PUBLIC_KEY',
      ip: '203.0.113.10',
      balance: 1000,
    },
  })

  await prisma.validator.upsert({
    where: { id: validatorId2 },
    update: {
      publicKey: 'VAL2_PUBLIC_KEY',
      ip: '203.0.113.11',
      balance: 1500,
    },
    create: {
      id: validatorId2,
      publicKey: 'VAL2_PUBLIC_KEY',
      ip: '203.0.113.11',
      balance: 1500,
    },
  })

  // Escalation for monitor 1 with two levels
  await prisma.escalation.upsert({
    where: { id: escalationId },
    update: { name: 'Default Policy', enabled: true },
    create: {
      id: escalationId,
      monitorId: monitorId1,
      name: 'Default Policy',
      enabled: true,
    },
  })

  // Ensure levels exist (create if missing)
  // We use createMany with skipDuplicates so re-running seed is safe
  await prisma.escalationLevel.createMany({
    data: [
      {
        id: 'e1-l1-0000-0000-000000000001',
        escalationId,
        levelOrder: 1,
        waitMinutes: 5,
        channel: 'EMAIL',
        contacts: ['oncall@example.com'],
        message: 'Monitor {{monitor.name}} is failing. Please investigate.'
      },
      {
        id: 'e1-l2-0000-0000-000000000002',
        escalationId,
        levelOrder: 2,
        waitMinutes: 10,
        channel: 'SLACK',
        contacts: ['#alerts'],
        message: 'Escalation level 2 reached for {{monitor.name}}.'
      },
    ],
    skipDuplicates: true,
  })

  // Alert for monitor 1
  await prisma.alert.upsert({
    where: { id: alertId },
    update: {},
    create: {
      id: alertId,
      severity: 'MEDIUM',
      title: 'Unexpected status code',
      message: 'Received 500 from endpoint',
      triggerStatusCode: 500,
      expectedStatusCode: 200,
      status: 'PENDING',
      monitorId: monitorId1,
    },
  })

  // Incident for monitor 1
  await prisma.incident.upsert({
    where: { id: incidentId },
    update: {},
    create: {
      id: incidentId,
      title: 'Service outage',
      description: 'Primary endpoint returning 5xx',
      severity: 'MAJOR',
      status: 'INVESTIGATING',
      monitorId: monitorId1,
      escalated: true,
    },
  })

  // Comment by user on incident
  await prisma.comment.upsert({
    where: { id: commentId },
    update: {},
    create: {
      id: commentId,
      description: 'Looking into pod restarts in the cluster.',
      incidentId,
      userId,
    },
  })

  // Postmortem for the same incident
  await prisma.postmortem.upsert({
    where: { id: postmortemId },
    update: {
      resolutionTime: 42,
      rootCause: 'Resource exhaustion on API nodes',
      resolution: 'Scaled node pool and added circuit breakers',
      incidentId,
    },
    create: {
      id: postmortemId,
      resolutionTime: 42,
      rootCause: 'Resource exhaustion on API nodes',
      resolution: 'Scaled node pool and added circuit breakers',
      incidentId,
    },
  })

  // Link incident to postmortemId field as well
  await prisma.incident.update({
    where: { id: incidentId },
    data: { postmortemId },
  })

  // Monitor ticks for validators
  await prisma.monitorTick.upsert({
    where: { id: monitorTickId1 },
    update: {},
    create: {
      id: monitorTickId1,
      monitorId: monitorId1,
      validatorId: validatorId1,
      status: 'BAD',
      latency: 123.45,
    },
  })

  await prisma.monitorTick.upsert({
    where: { id: monitorTickId2 },
    update: {},
    create: {
      id: monitorTickId2,
      monitorId: monitorId1,
      validatorId: validatorId2,
      status: 'GOOD',
      latency: 87.65,
    },
  })

  // A second monitor tick for monitor 2 to show variety
  await prisma.monitorTick.createMany({
    data: [
      {
        id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
        monitorId: monitorId2,
        validatorId: validatorId1,
        status: 'GOOD',
        latency: 95.12,
      },
    ],
    skipDuplicates: true,
  })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })


