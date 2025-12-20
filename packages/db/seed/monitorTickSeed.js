import { prisma } from '../src/index.js';
import { v4 as uuidv4 } from 'uuid';

// Set your monitor ID here - update this with your actual monitor ID
const MONITOR_ID = '2db2ff12-38cb-46d1-baf5-5011be4fd8c9';
// Set the validator ID to use for all ticks
const VALIDATOR_ID = 'bc3e9a1e-c224-4649-ab53-44521cc5ca15';
// Sample cities with their coordinates and location data
const SAMPLE_LOCATIONS = [
  {
    city: 'New York',
    latitude: 40.7128,
    longitude: -74.0060,
    countryCode: 'US',
    continentCode: 'NA'
  },
  {
    city: 'London',
    latitude: 51.5074,
    longitude: -0.1278,
    countryCode: 'GB',
    continentCode: 'EU'
  },
  {
    city: 'Tokyo',
    latitude: 35.6762,
    longitude: 139.6503,
    countryCode: 'JP',
    continentCode: 'AS'
  },
  {
    city: 'Sydney',
    latitude: -33.8688,
    longitude: 151.2093,
    countryCode: 'AU',
    continentCode: 'OC'
  },
  {
    city: 'São Paulo',
    latitude: -23.5558,
    longitude: -46.6396,
    countryCode: 'BR',
    continentCode: 'SA'
  }
];

function getRandomLocation() {
  return SAMPLE_LOCATIONS[Math.floor(Math.random() * SAMPLE_LOCATIONS.length)];
}

function getRandomStatus() {
  return Math.random() < 0.85 ? 'GOOD' : 'BAD';
}

function getRandomLatency(status) {
  if (status === 'GOOD') {
    return Math.floor(Math.random() * 500) + 50; // 50-550ms for good status
  } else {
    return Math.floor(Math.random() * 2000) + 1000; // 1000-3000ms for bad status
  }
}

async function seedMonitorTicks() {
  console.log('Starting MonitorTick seeding...');
  
  // Check if the monitor exists
  const monitor = await prisma.monitor.findUnique({
    where: { id: MONITOR_ID }
  });
  
  if (!monitor) {
    console.error(`Monitor with ID ${MONITOR_ID} not found. Please update the MONITOR_ID in the seed file.`);
    return;
  }
  
  // Check if the validator exists
  const validator = await prisma.user.findUnique({
    where: { id: VALIDATOR_ID }
  });
  
  if (!validator) {
    console.error(`Validator with ID ${VALIDATOR_ID} not found. Please update the VALIDATOR_ID in the seed file.`);
    return;
  }
  
  console.log(`Using validator: ${validator.id}`);
  
  const monitorTicks = [];
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  
  // Generate 2 ticks for each minute for the last 24 hours (2880 data points)
  for (let i = 0; i < 1440; i++) {
    const tickTime = new Date(twentyFourHoursAgo.getTime() + i * 60 * 1000);
    
    // Create 2 ticks per minute
    for (let j = 0; j < 2; j++) {
      const location = getRandomLocation();
      const status = getRandomStatus();
      const latency = getRandomLatency(status);
      
      monitorTicks.push({
        id: uuidv4(),
        monitorId: MONITOR_ID,
        validatorId: VALIDATOR_ID,
        status,
        latency,
        longitude: location.longitude,
        latitude: location.latitude,
        countryCode: location.countryCode,
        continentCode: location.continentCode,
        city: location.city,
        createdAt: new Date(tickTime.getTime() + j * 30 * 1000) // Spread within the minute
      });
    }
  }
  
  console.log(`Creating ${monitorTicks.length} monitor ticks...`);
  
  // Insert the monitor ticks in batches
  const batchSize = 50;
  for (let i = 0; i < monitorTicks.length; i += batchSize) {
    const batch = monitorTicks.slice(i, i + batchSize);
    await prisma.monitorTick.createMany({
      data: batch
    });
    console.log(`Inserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(monitorTicks.length / batchSize)}`);
  }
  
  console.log(`Successfully seeded ${monitorTicks.length} MonitorTick records for the last 24 hours`);
  console.log(`Time range: ${twentyFourHoursAgo.toISOString()} to ${now.toISOString()}`);
}

async function main() {
  try {
    await seedMonitorTicks();
  } catch (error) {
    console.error('Error seeding MonitorTicks:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}


main()
// // Check if this file is being run directly
// const isMainModule = import.meta.url === `file://${process.argv[1]}`;

// if (isMainModule) {
//   main()
//     .then(() => {
//       console.log('Seeding completed successfully');
//       process.exit(0);
//     })
//     .catch((error) => {
//       console.error('Seeding failed:', error);
//       process.exit(1);
//     });
// }

// export { seedMonitorTicks };