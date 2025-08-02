import { prisma } from "db/client";

export async function connectDatabase(): Promise<void> {
  try {
    console.log("Connecting to database...");
    await prisma.$connect();
    
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Failed to connect to database:", error);
    console.error("Exiting application due to database connection failure");
    process.exit(1);
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    console.log("✅ Database disconnected successfully");
  } catch (error) {
    console.error("❌ Error disconnecting from database:", error);
  }
}

process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
}); 