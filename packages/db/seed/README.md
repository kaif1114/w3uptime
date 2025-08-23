# Database Seeding

This directory contains database seeding utilities for the W3Uptime project.

## MonitorTick Seeding

The `monitorTickSeed.ts` file creates dummy MonitorTick data for the last 2 hours for testing and development purposes.

### Usage

1. **Update the Monitor ID**: Open `monitorTickSeed.ts` and update the `MONITOR_ID` constant at the top of the file with your actual monitor ID.

2. **Ensure you have validators**: The script requires at least one validator (User with type 'VALIDATOR') in your database.

3. **Run the seed script**:
   ```bash
   # From the seed directory
   npm run seed:monitor-ticks
   
   # Or using ts-node directly
   npx ts-node monitorTickSeed.ts
   ```

### What it creates

- **120 MonitorTick records** for the last 2 hours
- **Data points every 5 minutes** (24 time intervals)
- **Up to 5 validators** per time interval
- **Random geographical locations** from major cities worldwide
- **Realistic latency values** (50-550ms for GOOD status, 1000-3000ms for BAD status)
- **85% GOOD status, 15% BAD status** for realistic monitoring data

### Sample Locations

The seed includes data from these cities:
- New York, USA
- London, UK
- Tokyo, Japan
- Sydney, Australia
- São Paulo, Brazil

### Requirements

- A monitor must exist in the database with the specified ID
- At least one validator (User with type 'VALIDATOR') must exist
- PostgreSQL database connection configured via `DATABASE_URL`