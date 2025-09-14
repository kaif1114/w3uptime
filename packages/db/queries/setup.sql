-- 1. First, ensure TimescaleDB extension is enabled
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Convert MonitorTick table to hypertable (run this once after table creation)
-- This should be done after the Prisma migration creates the table
SELECT create_hypertable('"MonitorTick"', 'createdAt', if_not_exists => TRUE);

-- 3. Create continuous aggregates for different time intervals

-- 3a. 5-minute continuous aggregate (for day view - 288 data points over 24 hours)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_tick_5min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', "createdAt") AS time_bucket,
    "monitorId",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, "monitorId";

-- 3b. 30-minute continuous aggregate (for week view - 336 data points over 7 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_tick_30min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('30 minutes', "createdAt") AS time_bucket,
    "monitorId",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, "monitorId";

-- 3c. 2-hour continuous aggregate (for month view - 360 data points over 30 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_tick_2hour
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('2 hours', "createdAt") AS time_bucket,
    "monitorId",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, "monitorId";


-----------------------



-- 5-minute continental aggregate (for detailed continental analysis)
CREATE MATERIALIZED VIEW IF NOT EXISTS continent_tick_5min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', "createdAt") AS time_bucket,
    "continentCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, "continentCode";

-- 30-minute continental aggregate (for weekly continental analysis)
CREATE MATERIALIZED VIEW IF NOT EXISTS continent_tick_30min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('30 minutes', "createdAt") AS time_bucket,
    "continentCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, "continentCode";

-- 2-hour continental aggregate (for monthly continental analysis)
CREATE MATERIALIZED VIEW IF NOT EXISTS continent_tick_2hour
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('2 hours', "createdAt") AS time_bucket,
    "continentCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, "continentCode";

-- 5b. Country continuous aggregates

-- 5-minute country aggregate (for detailed country analysis)
CREATE MATERIALIZED VIEW IF NOT EXISTS country_tick_5min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', "createdAt") AS time_bucket,
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, "countryCode";

-- 30-minute country aggregate (for weekly country analysis)
CREATE MATERIALIZED VIEW IF NOT EXISTS country_tick_30min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('30 minutes', "createdAt") AS time_bucket,
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, "countryCode";

-- 2-hour country aggregate (for monthly country analysis)
CREATE MATERIALIZED VIEW IF NOT EXISTS country_tick_2hour
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('2 hours', "createdAt") AS time_bucket,
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, "countryCode";

-- 5c. City continuous aggregates

-- 5-minute city aggregate (for detailed city analysis)
CREATE MATERIALIZED VIEW IF NOT EXISTS city_tick_5min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', "createdAt") AS time_bucket,
    city,
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, city, "countryCode";

-- 30-minute city aggregate (for weekly city analysis)
CREATE MATERIALIZED VIEW IF NOT EXISTS city_tick_30min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('30 minutes', "createdAt") AS time_bucket,
    city,
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, city, "countryCode";

-- 2-hour city aggregate (for monthly city analysis)
CREATE MATERIALIZED VIEW IF NOT EXISTS city_tick_2hour
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('2 hours', "createdAt") AS time_bucket,
    city,
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
GROUP BY time_bucket, city, "countryCode";


-- 4. Create refresh policies for continuous aggregates
-- Refresh every 30 seconds for 5-minute aggregate (for day view - 24 hours)
SELECT add_continuous_aggregate_policy('monitor_tick_5min',
    start_offset => INTERVAL '25 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE);

-- a little more optimized but includes the lag
-- SELECT add_continuous_aggregate_policy('monitor_tick_5min',
--     start_offset => INTERVAL '1 hour',
--     end_offset => INTERVAL '2 minutes',
--     schedule_interval => INTERVAL '1 minutes',
--     if_not_exists => TRUE);

-- Refresh every 5 minutes for 30-minute aggregate (for week view - 7 days)
SELECT add_continuous_aggregate_policy('monitor_tick_30min',
    start_offset => INTERVAL '8 days', 
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes',
    if_not_exists => TRUE);

-- Refresh every 15 minutes for 2-hour aggregate (for month view - 30 days)
SELECT add_continuous_aggregate_policy('monitor_tick_2hour',
    start_offset => INTERVAL '32 days',
    end_offset => INTERVAL '30 minutes', 
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);

-- Regional continuous aggregates refresh policies

-- Continental aggregates refresh policies (for day view - 24 hours)
SELECT add_continuous_aggregate_policy('continent_tick_5min',
    start_offset => INTERVAL '25 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('continent_tick_30min',
    start_offset => INTERVAL '8 days', 
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('continent_tick_2hour',
    start_offset => INTERVAL '32 days',
    end_offset => INTERVAL '30 minutes', 
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);

-- Country aggregates refresh policies (for day view - 24 hours)
SELECT add_continuous_aggregate_policy('country_tick_5min',
    start_offset => INTERVAL '25 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('country_tick_30min',
    start_offset => INTERVAL '8 days', 
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('country_tick_2hour',
    start_offset => INTERVAL '32 days',
    end_offset => INTERVAL '30 minutes', 
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);

-- City aggregates refresh policies (for day view - 24 hours)
SELECT add_continuous_aggregate_policy('city_tick_5min',
    start_offset => INTERVAL '25 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('city_tick_30min',
    start_offset => INTERVAL '8 days', 
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('city_tick_2hour',
    start_offset => INTERVAL '32 days',
    end_offset => INTERVAL '30 minutes', 
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);

-- Monitor-specific regional aggregates refresh policies

-- Monitor-specific Continental aggregates refresh policies
SELECT add_continuous_aggregate_policy('monitor_continent_tick_5min',
    start_offset => INTERVAL '25 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('monitor_continent_tick_30min',
    start_offset => INTERVAL '8 days', 
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('monitor_continent_tick_2hour',
    start_offset => INTERVAL '32 days',
    end_offset => INTERVAL '30 minutes', 
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);

-- Monitor-specific Country aggregates refresh policies
SELECT add_continuous_aggregate_policy('monitor_country_tick_5min',
    start_offset => INTERVAL '25 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('monitor_country_tick_30min',
    start_offset => INTERVAL '8 days', 
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('monitor_country_tick_2hour',
    start_offset => INTERVAL '32 days',
    end_offset => INTERVAL '30 minutes', 
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);

-- Monitor-specific City aggregates refresh policies
SELECT add_continuous_aggregate_policy('monitor_city_tick_5min',
    start_offset => INTERVAL '25 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('monitor_city_tick_30min',
    start_offset => INTERVAL '8 days', 
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('monitor_city_tick_2hour',
    start_offset => INTERVAL '32 days',
    end_offset => INTERVAL '30 minutes', 
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);

-- 5. Create monitor-specific regional continuous aggregates for analytics

-- 5a. Monitor-specific Continental continuous aggregates

-- Monitor-specific 5-minute continental aggregate (for detailed continental analysis per monitor)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_continent_tick_5min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', "createdAt") AS time_bucket,
    "monitorId",
    "continentCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
WHERE "continentCode" IS NOT NULL
GROUP BY time_bucket, "monitorId", "continentCode";

-- Monitor-specific 30-minute continental aggregate (for weekly continental analysis per monitor)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_continent_tick_30min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('30 minutes', "createdAt") AS time_bucket,
    "monitorId",
    "continentCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
WHERE "continentCode" IS NOT NULL
GROUP BY time_bucket, "monitorId", "continentCode";

-- Monitor-specific 2-hour continental aggregate (for monthly continental analysis per monitor)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_continent_tick_2hour
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('2 hours', "createdAt") AS time_bucket,
    "monitorId",
    "continentCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
WHERE "continentCode" IS NOT NULL
GROUP BY time_bucket, "monitorId", "continentCode";

-- 5b. Monitor-specific Country continuous aggregates

-- Monitor-specific 5-minute country aggregate (for detailed country analysis per monitor)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_country_tick_5min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', "createdAt") AS time_bucket,
    "monitorId",
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
WHERE "countryCode" IS NOT NULL
GROUP BY time_bucket, "monitorId", "countryCode";

-- Monitor-specific 30-minute country aggregate (for weekly country analysis per monitor)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_country_tick_30min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('30 minutes', "createdAt") AS time_bucket,
    "monitorId",
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
WHERE "countryCode" IS NOT NULL
GROUP BY time_bucket, "monitorId", "countryCode";

-- Monitor-specific 2-hour country aggregate (for monthly country analysis per monitor)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_country_tick_2hour
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('2 hours', "createdAt") AS time_bucket,
    "monitorId",
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
WHERE "countryCode" IS NOT NULL
GROUP BY time_bucket, "monitorId", "countryCode";

-- 5c. Monitor-specific City continuous aggregates

-- Monitor-specific 5-minute city aggregate (for detailed city analysis per monitor)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_city_tick_5min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', "createdAt") AS time_bucket,
    "monitorId",
    city,
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
WHERE city IS NOT NULL AND "countryCode" IS NOT NULL
GROUP BY time_bucket, "monitorId", city, "countryCode";

-- Monitor-specific 30-minute city aggregate (for weekly city analysis per monitor)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_city_tick_30min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('30 minutes', "createdAt") AS time_bucket,
    "monitorId",
    city,
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
WHERE city IS NOT NULL AND "countryCode" IS NOT NULL
GROUP BY time_bucket, "monitorId", city, "countryCode";

-- Monitor-specific 2-hour city aggregate (for monthly city analysis per monitor)
CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_city_tick_2hour
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('2 hours', "createdAt") AS time_bucket,
    "monitorId",
    city,
    "countryCode",
    COUNT(*) as total_ticks,
    COUNT(*) FILTER (WHERE status = 'GOOD') as successful_ticks,
    AVG(latency) as avg_latency,
    MIN(latency) as min_latency,
    MAX(latency) as max_latency,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency) as median_latency,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency) as p95_latency
FROM "MonitorTick"
WHERE city IS NOT NULL AND "countryCode" IS NOT NULL
GROUP BY time_bucket, "monitorId", city, "countryCode";

-- 6. Create functions to query monitor timeseries data

-- Function to get monitor timeseries for different time periods
CREATE OR REPLACE FUNCTION get_monitor_timeseries(
    p_monitor_id UUID,
    p_period TEXT DEFAULT 'day'
) RETURNS TABLE (
    timestamp_bucket TIMESTAMPTZ,
    avg_latency NUMERIC,
    min_latency NUMERIC,
    max_latency NUMERIC,
    median_latency NUMERIC,
    p95_latency NUMERIC,
    total_ticks BIGINT,
    successful_ticks BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    CASE p_period
        WHEN 'day' THEN
            RETURN QUERY
            SELECT 
                monitor_tick_5min.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                ROUND(monitor_tick_5min.avg_latency::NUMERIC, 2) AS avg_latency,
                ROUND(monitor_tick_5min.min_latency::NUMERIC, 2) AS min_latency,
                ROUND(monitor_tick_5min.max_latency::NUMERIC, 2) AS max_latency,
                ROUND(monitor_tick_5min.median_latency::NUMERIC, 2) AS median_latency,
                ROUND(monitor_tick_5min.p95_latency::NUMERIC, 2) AS p95_latency,
                monitor_tick_5min.total_ticks AS total_ticks,
                monitor_tick_5min.successful_ticks AS successful_ticks,
                CASE 
                    WHEN monitor_tick_5min.total_ticks > 0 
                    THEN ROUND((monitor_tick_5min.successful_ticks::NUMERIC / monitor_tick_5min.total_ticks::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_5min
            WHERE monitor_tick_5min."monitorId" = p_monitor_id::text
                AND monitor_tick_5min.time_bucket >= NOW() - INTERVAL '24 hours'
                AND monitor_tick_5min.time_bucket <= NOW()
            ORDER BY monitor_tick_5min.time_bucket ASC;
            
        WHEN 'week' THEN
            RETURN QUERY
            SELECT 
                monitor_tick_30min.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                ROUND(monitor_tick_30min.avg_latency::NUMERIC, 2) AS avg_latency,
                ROUND(monitor_tick_30min.min_latency::NUMERIC, 2) AS min_latency,
                ROUND(monitor_tick_30min.max_latency::NUMERIC, 2) AS max_latency,
                ROUND(monitor_tick_30min.median_latency::NUMERIC, 2) AS median_latency,
                ROUND(monitor_tick_30min.p95_latency::NUMERIC, 2) AS p95_latency,
                monitor_tick_30min.total_ticks AS total_ticks,
                monitor_tick_30min.successful_ticks AS successful_ticks,
                CASE 
                    WHEN monitor_tick_30min.total_ticks > 0 
                    THEN ROUND((monitor_tick_30min.successful_ticks::NUMERIC / monitor_tick_30min.total_ticks::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_30min
            WHERE monitor_tick_30min."monitorId" = p_monitor_id::text
                AND monitor_tick_30min.time_bucket >= NOW() - INTERVAL '7 days'
                AND monitor_tick_30min.time_bucket <= NOW()
            ORDER BY monitor_tick_30min.time_bucket ASC;
            
        WHEN 'month' THEN
            RETURN QUERY
            SELECT 
                monitor_tick_2hour.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                ROUND(monitor_tick_2hour.avg_latency::NUMERIC, 2) AS avg_latency,
                ROUND(monitor_tick_2hour.min_latency::NUMERIC, 2) AS min_latency,
                ROUND(monitor_tick_2hour.max_latency::NUMERIC, 2) AS max_latency,
                ROUND(monitor_tick_2hour.median_latency::NUMERIC, 2) AS median_latency,
                ROUND(monitor_tick_2hour.p95_latency::NUMERIC, 2) AS p95_latency,
                monitor_tick_2hour.total_ticks AS total_ticks,
                monitor_tick_2hour.successful_ticks AS successful_ticks,
                CASE 
                    WHEN monitor_tick_2hour.total_ticks > 0 
                    THEN ROUND((monitor_tick_2hour.successful_ticks::NUMERIC / monitor_tick_2hour.total_ticks::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_2hour
            WHERE monitor_tick_2hour."monitorId" = p_monitor_id::text
                AND monitor_tick_2hour.time_bucket >= NOW() - INTERVAL '30 days'
                AND monitor_tick_2hour.time_bucket <= NOW()
            ORDER BY monitor_tick_2hour.time_bucket ASC;
        ELSE
            RAISE EXCEPTION 'Invalid period. Use: day, week, or month';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get overall monitor statistics
CREATE OR REPLACE FUNCTION get_monitor_stats(
    p_monitor_id UUID,
    p_period TEXT DEFAULT 'day'
) RETURNS TABLE (
    total_checks BIGINT,
    successful_checks BIGINT,
    failed_checks BIGINT,
    uptime_percentage NUMERIC,
    avg_response_time NUMERIC,
    min_response_time NUMERIC,
    max_response_time NUMERIC,
    p95_response_time NUMERIC
) AS $$
BEGIN
    CASE p_period
        WHEN 'day' THEN
            RETURN QUERY
            SELECT 
                COALESCE(SUM(monitor_tick_5min.total_ticks), 0)::BIGINT as total_checks,
                COALESCE(SUM(monitor_tick_5min.successful_ticks), 0)::BIGINT as successful_checks,
                COALESCE(SUM(monitor_tick_5min.total_ticks - monitor_tick_5min.successful_ticks), 0)::BIGINT as failed_checks,
                CASE 
                    WHEN SUM(monitor_tick_5min.total_ticks) > 0 
                    THEN ROUND((SUM(monitor_tick_5min.successful_ticks)::NUMERIC / SUM(monitor_tick_5min.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END as uptime_percentage,
                ROUND(AVG(monitor_tick_5min.avg_latency)::NUMERIC, 2) as avg_response_time,
                ROUND(MIN(monitor_tick_5min.min_latency)::NUMERIC, 2) as min_response_time,
                ROUND(MAX(monitor_tick_5min.max_latency)::NUMERIC, 2) as max_response_time,
                ROUND(AVG(monitor_tick_5min.p95_latency)::NUMERIC, 2) as p95_response_time
            FROM monitor_tick_5min
            WHERE monitor_tick_5min."monitorId" = p_monitor_id::text
                AND monitor_tick_5min.time_bucket >= NOW() - INTERVAL '24 hours';
                
        WHEN 'week' THEN
            RETURN QUERY
            SELECT 
                COALESCE(SUM(monitor_tick_30min.total_ticks), 0)::BIGINT as total_checks,
                COALESCE(SUM(monitor_tick_30min.successful_ticks), 0)::BIGINT as successful_checks,
                COALESCE(SUM(monitor_tick_30min.total_ticks - monitor_tick_30min.successful_ticks), 0)::BIGINT as failed_checks,
                CASE 
                    WHEN SUM(monitor_tick_30min.total_ticks) > 0 
                    THEN ROUND((SUM(monitor_tick_30min.successful_ticks)::NUMERIC / SUM(monitor_tick_30min.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END as uptime_percentage,
                ROUND(AVG(monitor_tick_30min.avg_latency)::NUMERIC, 2) as avg_response_time,
                ROUND(MIN(monitor_tick_30min.min_latency)::NUMERIC, 2) as min_response_time,
                ROUND(MAX(monitor_tick_30min.max_latency)::NUMERIC, 2) as max_response_time,
                ROUND(AVG(monitor_tick_30min.p95_latency)::NUMERIC, 2) as p95_response_time
            FROM monitor_tick_30min
            WHERE monitor_tick_30min."monitorId" = p_monitor_id::text
                AND monitor_tick_30min.time_bucket >= NOW() - INTERVAL '7 days';
                
        WHEN 'month' THEN
            RETURN QUERY
            SELECT 
                COALESCE(SUM(monitor_tick_2hour.total_ticks), 0)::BIGINT as total_checks,
                COALESCE(SUM(monitor_tick_2hour.successful_ticks), 0)::BIGINT as successful_checks,
                COALESCE(SUM(monitor_tick_2hour.total_ticks - monitor_tick_2hour.successful_ticks), 0)::BIGINT as failed_checks,
                CASE 
                    WHEN SUM(monitor_tick_2hour.total_ticks) > 0 
                    THEN ROUND((SUM(monitor_tick_2hour.successful_ticks)::NUMERIC / SUM(monitor_tick_2hour.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END as uptime_percentage,
                ROUND(AVG(monitor_tick_2hour.avg_latency)::NUMERIC, 2) as avg_response_time,
                ROUND(MIN(monitor_tick_2hour.min_latency)::NUMERIC, 2) as min_response_time,
                ROUND(MAX(monitor_tick_2hour.max_latency)::NUMERIC, 2) as max_response_time,
                ROUND(AVG(monitor_tick_2hour.p95_latency)::NUMERIC, 2) as p95_response_time
            FROM monitor_tick_2hour
            WHERE monitor_tick_2hour."monitorId" = p_monitor_id::text
                AND monitor_tick_2hour.time_bucket >= NOW() - INTERVAL '30 days';
        ELSE
            RAISE EXCEPTION 'Invalid period. Use: day, week, or month';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get monitor-specific regional data by country (optimized with materialized views)
CREATE OR REPLACE FUNCTION get_monitor_country_data(
    p_monitor_id UUID,
    p_period TEXT DEFAULT 'day'
) RETURNS TABLE (
    country_code TEXT,
    avg_latency NUMERIC,
    total_ticks BIGINT,
    successful_ticks BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    CASE p_period
        WHEN 'day' THEN
            RETURN QUERY
            SELECT 
                mc."countryCode"::TEXT AS country_code,
                ROUND(AVG(mc.avg_latency)::NUMERIC, 2) AS avg_latency,
                COALESCE(SUM(mc.total_ticks), 0)::BIGINT AS total_ticks,
                COALESCE(SUM(mc.successful_ticks), 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mc.total_ticks) > 0 
                    THEN ROUND((SUM(mc.successful_ticks)::NUMERIC / SUM(mc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_country_tick_5min mc
            WHERE mc."monitorId" = p_monitor_id::text
                AND mc.time_bucket >= NOW() - INTERVAL '24 hours'
                AND mc.time_bucket <= NOW()
            GROUP BY mc."countryCode";
            
        WHEN 'week' THEN
            RETURN QUERY
            SELECT 
                mc."countryCode"::TEXT AS country_code,
                ROUND(AVG(mc.avg_latency)::NUMERIC, 2) AS avg_latency,
                COALESCE(SUM(mc.total_ticks), 0)::BIGINT AS total_ticks,
                COALESCE(SUM(mc.successful_ticks), 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mc.total_ticks) > 0 
                    THEN ROUND((SUM(mc.successful_ticks)::NUMERIC / SUM(mc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_country_tick_30min mc
            WHERE mc."monitorId" = p_monitor_id::text
                AND mc.time_bucket >= NOW() - INTERVAL '7 days'
                AND mc.time_bucket <= NOW()
            GROUP BY mc."countryCode";
            
        WHEN 'month' THEN
            RETURN QUERY
            SELECT 
                mc."countryCode"::TEXT AS country_code,
                ROUND(AVG(mc.avg_latency)::NUMERIC, 2) AS avg_latency,
                COALESCE(SUM(mc.total_ticks), 0)::BIGINT AS total_ticks,
                COALESCE(SUM(mc.successful_ticks), 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mc.total_ticks) > 0 
                    THEN ROUND((SUM(mc.successful_ticks)::NUMERIC / SUM(mc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_country_tick_2hour mc
            WHERE mc."monitorId" = p_monitor_id::text
                AND mc.time_bucket >= NOW() - INTERVAL '30 days'
                AND mc.time_bucket <= NOW()
            GROUP BY mc."countryCode";
        ELSE
            RAISE EXCEPTION 'Invalid period. Use: day, week, or month';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get monitor-specific regional data by continent (optimized with materialized views)
CREATE OR REPLACE FUNCTION get_monitor_continent_data(
    p_monitor_id UUID,
    p_period TEXT DEFAULT 'day'
) RETURNS TABLE (
    continent_code TEXT,
    avg_latency NUMERIC,
    total_ticks BIGINT,
    successful_ticks BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    CASE p_period
        WHEN 'day' THEN
            RETURN QUERY
            SELECT 
                mc."continentCode"::TEXT AS continent_code,
                ROUND(AVG(mc.avg_latency)::NUMERIC, 2) AS avg_latency,
                COALESCE(SUM(mc.total_ticks), 0)::BIGINT AS total_ticks,
                COALESCE(SUM(mc.successful_ticks), 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mc.total_ticks) > 0 
                    THEN ROUND((SUM(mc.successful_ticks)::NUMERIC / SUM(mc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_continent_tick_5min mc
            WHERE mc."monitorId" = p_monitor_id::text
                AND mc.time_bucket >= NOW() - INTERVAL '24 hours'
                AND mc.time_bucket <= NOW()
            GROUP BY mc."continentCode";
            
        WHEN 'week' THEN
            RETURN QUERY
            SELECT 
                mc."continentCode"::TEXT AS continent_code,
                ROUND(AVG(mc.avg_latency)::NUMERIC, 2) AS avg_latency,
                COALESCE(SUM(mc.total_ticks), 0)::BIGINT AS total_ticks,
                COALESCE(SUM(mc.successful_ticks), 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mc.total_ticks) > 0 
                    THEN ROUND((SUM(mc.successful_ticks)::NUMERIC / SUM(mc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_continent_tick_30min mc
            WHERE mc."monitorId" = p_monitor_id::text
                AND mc.time_bucket >= NOW() - INTERVAL '7 days'
                AND mc.time_bucket <= NOW()
            GROUP BY mc."continentCode";
            
        WHEN 'month' THEN
            RETURN QUERY
            SELECT 
                mc."continentCode"::TEXT AS continent_code,
                ROUND(AVG(mc.avg_latency)::NUMERIC, 2) AS avg_latency,
                COALESCE(SUM(mc.total_ticks), 0)::BIGINT AS total_ticks,
                COALESCE(SUM(mc.successful_ticks), 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mc.total_ticks) > 0 
                    THEN ROUND((SUM(mc.successful_ticks)::NUMERIC / SUM(mc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_continent_tick_2hour mc
            WHERE mc."monitorId" = p_monitor_id::text
                AND mc.time_bucket >= NOW() - INTERVAL '30 days'
                AND mc.time_bucket <= NOW()
            GROUP BY mc."continentCode";
        ELSE
            RAISE EXCEPTION 'Invalid period. Use: day, week, or month';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get monitor-specific best/worst regions
CREATE OR REPLACE FUNCTION get_monitor_best_worst_regions(
    p_monitor_id UUID,
    p_period TEXT DEFAULT 'day',
    p_region_type TEXT DEFAULT 'country',
    p_order TEXT DEFAULT 'best'
) RETURNS TABLE (
    region_id TEXT,
    region_name TEXT,
    avg_latency NUMERIC,
    success_rate NUMERIC,
    total_checks BIGINT,
    performance_score NUMERIC,
    rank_position BIGINT
) AS $$
BEGIN
    IF p_region_type = 'country' THEN
        RETURN QUERY
        SELECT 
            cd.country_code AS region_id,
            cd.country_code AS region_name,
            cd.avg_latency,
            cd.success_rate,
            cd.total_ticks AS total_checks,
            CASE 
                WHEN cd.total_ticks > 0 
                THEN ROUND((cd.success_rate * 0.6) + ((100 - LEAST(cd.avg_latency / 10, 100)) * 0.4), 2)
                ELSE 0
            END AS performance_score,
            ROW_NUMBER() OVER (
                ORDER BY 
                    CASE WHEN p_order = 'best' THEN cd.success_rate END DESC,
                    CASE WHEN p_order = 'best' THEN cd.avg_latency END ASC,
                    CASE WHEN p_order = 'worst' THEN cd.success_rate END ASC,
                    CASE WHEN p_order = 'worst' THEN cd.avg_latency END DESC
            ) as rank_position
        FROM get_monitor_country_data(p_monitor_id, p_period) cd
        WHERE cd.total_ticks > 0;
        
    ELSIF p_region_type = 'continent' THEN
        RETURN QUERY
        SELECT 
            cd.continent_code AS region_id,
            cd.continent_code AS region_name,
            cd.avg_latency,
            cd.success_rate,
            cd.total_ticks AS total_checks,
            CASE 
                WHEN cd.total_ticks > 0 
                THEN ROUND((cd.success_rate * 0.6) + ((100 - LEAST(cd.avg_latency / 10, 100)) * 0.4), 2)
                ELSE 0
            END AS performance_score,
            ROW_NUMBER() OVER (
                ORDER BY 
                    CASE WHEN p_order = 'best' THEN cd.success_rate END DESC,
                    CASE WHEN p_order = 'best' THEN cd.avg_latency END ASC,
                    CASE WHEN p_order = 'worst' THEN cd.success_rate END ASC,
                    CASE WHEN p_order = 'worst' THEN cd.avg_latency END DESC
            ) as rank_position
        FROM get_monitor_continent_data(p_monitor_id, p_period) cd
        WHERE cd.total_ticks > 0;
    ELSE
        RAISE EXCEPTION 'Invalid region_type. Use: country or continent';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get monitor-specific regional timeseries data
CREATE OR REPLACE FUNCTION get_monitor_regional_timeseries(
    p_monitor_id UUID,
    p_region_type TEXT DEFAULT 'country',
    p_region_id TEXT DEFAULT NULL,
    p_period TEXT DEFAULT 'day'
) RETURNS TABLE (
    timestamp_bucket TIMESTAMPTZ,
    region_id TEXT,
    avg_latency NUMERIC,
    min_latency NUMERIC,
    max_latency NUMERIC,
    median_latency NUMERIC,
    p95_latency NUMERIC,
    total_ticks BIGINT,
    successful_ticks BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    CASE p_region_type
        WHEN 'continent' THEN
            CASE p_period
                WHEN 'day' THEN
                    RETURN QUERY
                    SELECT 
                        mc.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                        mc."continentCode"::TEXT AS region_id,
                        ROUND(mc.avg_latency::NUMERIC, 2) AS avg_latency,
                        ROUND(mc.min_latency::NUMERIC, 2) AS min_latency,
                        ROUND(mc.max_latency::NUMERIC, 2) AS max_latency,
                        ROUND(mc.median_latency::NUMERIC, 2) AS median_latency,
                        ROUND(mc.p95_latency::NUMERIC, 2) AS p95_latency,
                        mc.total_ticks AS total_ticks,
                        mc.successful_ticks AS successful_ticks,
                        CASE 
                            WHEN mc.total_ticks > 0 
                            THEN ROUND((mc.successful_ticks::NUMERIC / mc.total_ticks::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate
                    FROM monitor_continent_tick_5min mc
                    WHERE mc."monitorId" = p_monitor_id::text
                        AND mc.time_bucket >= NOW() - INTERVAL '24 hours'
                        AND mc.time_bucket <= NOW()
                        AND (p_region_id IS NULL OR mc."continentCode" = p_region_id)
                    ORDER BY mc.time_bucket ASC;
                    
                WHEN 'week' THEN
                    RETURN QUERY
                    SELECT 
                        mc.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                        mc."continentCode"::TEXT AS region_id,
                        ROUND(mc.avg_latency::NUMERIC, 2) AS avg_latency,
                        ROUND(mc.min_latency::NUMERIC, 2) AS min_latency,
                        ROUND(mc.max_latency::NUMERIC, 2) AS max_latency,
                        ROUND(mc.median_latency::NUMERIC, 2) AS median_latency,
                        ROUND(mc.p95_latency::NUMERIC, 2) AS p95_latency,
                        mc.total_ticks AS total_ticks,
                        mc.successful_ticks AS successful_ticks,
                        CASE 
                            WHEN mc.total_ticks > 0 
                            THEN ROUND((mc.successful_ticks::NUMERIC / mc.total_ticks::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate
                    FROM monitor_continent_tick_30min mc
                    WHERE mc."monitorId" = p_monitor_id::text
                        AND mc.time_bucket >= NOW() - INTERVAL '7 days'
                        AND mc.time_bucket <= NOW()
                        AND (p_region_id IS NULL OR mc."continentCode" = p_region_id)
                    ORDER BY mc.time_bucket ASC;
                    
                WHEN 'month' THEN
                    RETURN QUERY
                    SELECT 
                        mc.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                        mc."continentCode"::TEXT AS region_id,
                        ROUND(mc.avg_latency::NUMERIC, 2) AS avg_latency,
                        ROUND(mc.min_latency::NUMERIC, 2) AS min_latency,
                        ROUND(mc.max_latency::NUMERIC, 2) AS max_latency,
                        ROUND(mc.median_latency::NUMERIC, 2) AS median_latency,
                        ROUND(mc.p95_latency::NUMERIC, 2) AS p95_latency,
                        mc.total_ticks AS total_ticks,
                        mc.successful_ticks AS successful_ticks,
                        CASE 
                            WHEN mc.total_ticks > 0 
                            THEN ROUND((mc.successful_ticks::NUMERIC / mc.total_ticks::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate
                    FROM monitor_continent_tick_2hour mc
                    WHERE mc."monitorId" = p_monitor_id::text
                        AND mc.time_bucket >= NOW() - INTERVAL '30 days'
                        AND mc.time_bucket <= NOW()
                        AND (p_region_id IS NULL OR mc."continentCode" = p_region_id)
                    ORDER BY mc.time_bucket ASC;
            END CASE;
            
        WHEN 'country' THEN
            CASE p_period
                WHEN 'day' THEN
                    RETURN QUERY
                    SELECT 
                        mc.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                        mc."countryCode"::TEXT AS region_id,
                        ROUND(mc.avg_latency::NUMERIC, 2) AS avg_latency,
                        ROUND(mc.min_latency::NUMERIC, 2) AS min_latency,
                        ROUND(mc.max_latency::NUMERIC, 2) AS max_latency,
                        ROUND(mc.median_latency::NUMERIC, 2) AS median_latency,
                        ROUND(mc.p95_latency::NUMERIC, 2) AS p95_latency,
                        mc.total_ticks AS total_ticks,
                        mc.successful_ticks AS successful_ticks,
                        CASE 
                            WHEN mc.total_ticks > 0 
                            THEN ROUND((mc.successful_ticks::NUMERIC / mc.total_ticks::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate
                    FROM monitor_country_tick_5min mc
                    WHERE mc."monitorId" = p_monitor_id::text
                        AND mc.time_bucket >= NOW() - INTERVAL '24 hours'
                        AND mc.time_bucket <= NOW()
                        AND (p_region_id IS NULL OR mc."countryCode" = p_region_id)
                    ORDER BY mc.time_bucket ASC;
                    
                WHEN 'week' THEN
                    RETURN QUERY
                    SELECT 
                        mc.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                        mc."countryCode"::TEXT AS region_id,
                        ROUND(mc.avg_latency::NUMERIC, 2) AS avg_latency,
                        ROUND(mc.min_latency::NUMERIC, 2) AS min_latency,
                        ROUND(mc.max_latency::NUMERIC, 2) AS max_latency,
                        ROUND(mc.median_latency::NUMERIC, 2) AS median_latency,
                        ROUND(mc.p95_latency::NUMERIC, 2) AS p95_latency,
                        mc.total_ticks AS total_ticks,
                        mc.successful_ticks AS successful_ticks,
                        CASE 
                            WHEN mc.total_ticks > 0 
                            THEN ROUND((mc.successful_ticks::NUMERIC / mc.total_ticks::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate
                    FROM monitor_country_tick_30min mc
                    WHERE mc."monitorId" = p_monitor_id::text
                        AND mc.time_bucket >= NOW() - INTERVAL '7 days'
                        AND mc.time_bucket <= NOW()
                        AND (p_region_id IS NULL OR mc."countryCode" = p_region_id)
                    ORDER BY mc.time_bucket ASC;
                    
                WHEN 'month' THEN
                    RETURN QUERY
                    SELECT 
                        mc.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                        mc."countryCode"::TEXT AS region_id,
                        ROUND(mc.avg_latency::NUMERIC, 2) AS avg_latency,
                        ROUND(mc.min_latency::NUMERIC, 2) AS min_latency,
                        ROUND(mc.max_latency::NUMERIC, 2) AS max_latency,
                        ROUND(mc.median_latency::NUMERIC, 2) AS median_latency,
                        ROUND(mc.p95_latency::NUMERIC, 2) AS p95_latency,
                        mc.total_ticks AS total_ticks,
                        mc.successful_ticks AS successful_ticks,
                        CASE 
                            WHEN mc.total_ticks > 0 
                            THEN ROUND((mc.successful_ticks::NUMERIC / mc.total_ticks::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate
                    FROM monitor_country_tick_2hour mc
                    WHERE mc."monitorId" = p_monitor_id::text
                        AND mc.time_bucket >= NOW() - INTERVAL '30 days'
                        AND mc.time_bucket <= NOW()
                        AND (p_region_id IS NULL OR mc."countryCode" = p_region_id)
                    ORDER BY mc.time_bucket ASC;
            END CASE;
            
        WHEN 'city' THEN
            CASE p_period
                WHEN 'day' THEN
                    RETURN QUERY
                    SELECT 
                        mc.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                        CONCAT(mc.city, ', ', mc."countryCode")::TEXT AS region_id,
                        ROUND(mc.avg_latency::NUMERIC, 2) AS avg_latency,
                        ROUND(mc.min_latency::NUMERIC, 2) AS min_latency,
                        ROUND(mc.max_latency::NUMERIC, 2) AS max_latency,
                        ROUND(mc.median_latency::NUMERIC, 2) AS median_latency,
                        ROUND(mc.p95_latency::NUMERIC, 2) AS p95_latency,
                        mc.total_ticks AS total_ticks,
                        mc.successful_ticks AS successful_ticks,
                        CASE 
                            WHEN mc.total_ticks > 0 
                            THEN ROUND((mc.successful_ticks::NUMERIC / mc.total_ticks::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate
                    FROM monitor_city_tick_5min mc
                    WHERE mc."monitorId" = p_monitor_id::text
                        AND mc.time_bucket >= NOW() - INTERVAL '24 hours'
                        AND mc.time_bucket <= NOW()
                        AND (p_region_id IS NULL OR CONCAT(mc.city, ', ', mc."countryCode") = p_region_id)
                    ORDER BY mc.time_bucket ASC;
                    
                WHEN 'week' THEN
                    RETURN QUERY
                    SELECT 
                        mc.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                        CONCAT(mc.city, ', ', mc."countryCode")::TEXT AS region_id,
                        ROUND(mc.avg_latency::NUMERIC, 2) AS avg_latency,
                        ROUND(mc.min_latency::NUMERIC, 2) AS min_latency,
                        ROUND(mc.max_latency::NUMERIC, 2) AS max_latency,
                        ROUND(mc.median_latency::NUMERIC, 2) AS median_latency,
                        ROUND(mc.p95_latency::NUMERIC, 2) AS p95_latency,
                        mc.total_ticks AS total_ticks,
                        mc.successful_ticks AS successful_ticks,
                        CASE 
                            WHEN mc.total_ticks > 0 
                            THEN ROUND((mc.successful_ticks::NUMERIC / mc.total_ticks::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate
                    FROM monitor_city_tick_30min mc
                    WHERE mc."monitorId" = p_monitor_id::text
                        AND mc.time_bucket >= NOW() - INTERVAL '7 days'
                        AND mc.time_bucket <= NOW()
                        AND (p_region_id IS NULL OR CONCAT(mc.city, ', ', mc."countryCode") = p_region_id)
                    ORDER BY mc.time_bucket ASC;
                    
                WHEN 'month' THEN
                    RETURN QUERY
                    SELECT 
                        mc.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                        CONCAT(mc.city, ', ', mc."countryCode")::TEXT AS region_id,
                        ROUND(mc.avg_latency::NUMERIC, 2) AS avg_latency,
                        ROUND(mc.min_latency::NUMERIC, 2) AS min_latency,
                        ROUND(mc.max_latency::NUMERIC, 2) AS max_latency,
                        ROUND(mc.median_latency::NUMERIC, 2) AS median_latency,
                        ROUND(mc.p95_latency::NUMERIC, 2) AS p95_latency,
                        mc.total_ticks AS total_ticks,
                        mc.successful_ticks AS successful_ticks,
                        CASE 
                            WHEN mc.total_ticks > 0 
                            THEN ROUND((mc.successful_ticks::NUMERIC / mc.total_ticks::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate
                    FROM monitor_city_tick_2hour mc
                    WHERE mc."monitorId" = p_monitor_id::text
                        AND mc.time_bucket >= NOW() - INTERVAL '30 days'
                        AND mc.time_bucket <= NOW()
                        AND (p_region_id IS NULL OR CONCAT(mc.city, ', ', mc."countryCode") = p_region_id)
                    ORDER BY mc.time_bucket ASC;
            END CASE;
        ELSE
            RAISE EXCEPTION 'Invalid region_type. Use: continent, country, or city';
    END CASE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid period. Use: day, week, or month';
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 7. Regional analytics functions





-- Function to get regional performance ranking
CREATE OR REPLACE FUNCTION get_regional_performance_ranking(
    p_region_type TEXT DEFAULT 'continent',
    p_period TEXT DEFAULT 'day',
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 100
) RETURNS TABLE (
    region_id TEXT,
    region_name TEXT,
    avg_latency NUMERIC,
    success_rate NUMERIC,
    total_checks BIGINT,
    performance_score NUMERIC,
    rank_position BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rs.region_id,
        rs.region_id as region_name,
        rs.avg_response_time as avg_latency,
        rs.uptime_percentage as success_rate,
        rs.total_checks,
        rs.performance_score,
        ROW_NUMBER() OVER (ORDER BY rs.performance_score DESC) as rank_position
    FROM get_regional_stats(
        p_region_type := p_region_type,
        p_region_id := NULL,
        p_period := p_period,
        p_start_time := p_start_time,
        p_end_time := p_end_time
    ) rs
    WHERE rs.total_checks > 0
    ORDER BY rs.performance_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get best performing regions
CREATE OR REPLACE FUNCTION get_best_performing_regions(
    p_region_type TEXT DEFAULT 'continent',
    p_period TEXT DEFAULT 'day',
    p_limit INTEGER DEFAULT 10,
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
    region_id TEXT,
    region_name TEXT,
    avg_latency NUMERIC,
    success_rate NUMERIC,
    total_checks BIGINT,
    performance_score NUMERIC,
    rank_position BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_regional_performance_ranking(
        p_region_type := p_region_type,
        p_period := p_period,
        p_start_time := p_start_time,
        p_end_time := p_end_time,
        p_limit := p_limit
    )
    ORDER BY performance_score DESC, avg_latency ASC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get worst performing regions
CREATE OR REPLACE FUNCTION get_worst_performing_regions(
    p_region_type TEXT DEFAULT 'continent',
    p_period TEXT DEFAULT 'day',
    p_limit INTEGER DEFAULT 10,
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
    region_id TEXT,
    region_name TEXT,
    avg_latency NUMERIC,
    success_rate NUMERIC,
    total_checks BIGINT,
    performance_score NUMERIC,
    rank_position BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM get_regional_performance_ranking(
        p_region_type := p_region_type,
        p_period := p_period,
        p_start_time := p_start_time,
        p_end_time := p_end_time,
        p_limit := 1000  -- Get more results to sort from bottom
    )
    ORDER BY performance_score ASC, avg_latency DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get overall regional statistics
CREATE OR REPLACE FUNCTION get_regional_stats(
    p_region_type TEXT DEFAULT 'continent',
    p_region_id TEXT DEFAULT NULL,
    p_period TEXT DEFAULT 'day',
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
    region_type TEXT,
    region_id TEXT,
    total_checks BIGINT,
    successful_checks BIGINT,
    failed_checks BIGINT,
    uptime_percentage NUMERIC,
    avg_response_time NUMERIC,
    min_response_time NUMERIC,
    max_response_time NUMERIC,
    p95_response_time NUMERIC,
    median_response_time NUMERIC,
    performance_score NUMERIC
) AS $$
DECLARE
    start_time TIMESTAMPTZ;
    end_time TIMESTAMPTZ;
BEGIN
    -- Set default time ranges based on period
    CASE p_period
        WHEN 'day' THEN
            start_time := COALESCE(p_start_time, NOW() - INTERVAL '24 hours');
            end_time := COALESCE(p_end_time, NOW());
        WHEN 'week' THEN
            start_time := COALESCE(p_start_time, NOW() - INTERVAL '7 days');
            end_time := COALESCE(p_end_time, NOW());
        WHEN 'month' THEN
            start_time := COALESCE(p_start_time, NOW() - INTERVAL '30 days');
            end_time := COALESCE(p_end_time, NOW());
        ELSE
            start_time := COALESCE(p_start_time, NOW() - INTERVAL '24 hours');
            end_time := COALESCE(p_end_time, NOW());
    END CASE;

    -- Handle different region types
    CASE p_region_type
        WHEN 'continent' THEN
            -- Select appropriate continental aggregate based on time span
            IF end_time - start_time <= INTERVAL '24 hours' THEN
                RETURN QUERY
                SELECT 
                    p_region_type AS region_type,
                    c."continentCode"::TEXT AS region_id,
                    COALESCE(SUM(c.total_ticks), 0)::BIGINT AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0)::BIGINT AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0)::BIGINT AS failed_checks,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS uptime_percentage,
                    ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_response_time,
                    ROUND(MIN(c.min_latency)::NUMERIC, 2) AS min_response_time,
                    ROUND(MAX(c.max_latency)::NUMERIC, 2) AS max_response_time,
                    ROUND(AVG(c.p95_latency)::NUMERIC, 2) AS p95_response_time,
                    ROUND(AVG(c.median_latency)::NUMERIC, 2) AS median_response_time,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND(
                            (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                            ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                        )
                        ELSE 0
                    END AS performance_score
                FROM continent_tick_5min c
                WHERE (p_region_id IS NULL OR c."continentCode" = p_region_id)
                    AND c.time_bucket >= start_time
                    AND c.time_bucket <= end_time
                GROUP BY c."continentCode";
                
            ELSIF end_time - start_time <= INTERVAL '7 days' THEN
                RETURN QUERY
                SELECT 
                    p_region_type AS region_type,
                    c."continentCode"::TEXT AS region_id,
                    COALESCE(SUM(c.total_ticks), 0)::BIGINT AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0)::BIGINT AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0)::BIGINT AS failed_checks,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS uptime_percentage,
                    ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_response_time,
                    ROUND(MIN(c.min_latency)::NUMERIC, 2) AS min_response_time,
                    ROUND(MAX(c.max_latency)::NUMERIC, 2) AS max_response_time,
                    ROUND(AVG(c.p95_latency)::NUMERIC, 2) AS p95_response_time,
                    ROUND(AVG(c.median_latency)::NUMERIC, 2) AS median_response_time,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND(
                            (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                            ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                        )
                        ELSE 0
                    END AS performance_score
                FROM continent_tick_30min c
                WHERE (p_region_id IS NULL OR c."continentCode" = p_region_id)
                    AND c.time_bucket >= start_time
                    AND c.time_bucket <= end_time
                GROUP BY c."continentCode";
                
            ELSE
                RETURN QUERY
                SELECT 
                    p_region_type AS region_type,
                    c."continentCode"::TEXT AS region_id,
                    COALESCE(SUM(c.total_ticks), 0)::BIGINT AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0)::BIGINT AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0)::BIGINT AS failed_checks,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS uptime_percentage,
                    ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_response_time,
                    ROUND(MIN(c.min_latency)::NUMERIC, 2) AS min_response_time,
                    ROUND(MAX(c.max_latency)::NUMERIC, 2) AS max_response_time,
                    ROUND(AVG(c.p95_latency)::NUMERIC, 2) AS p95_response_time,
                    ROUND(AVG(c.median_latency)::NUMERIC, 2) AS median_response_time,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND(
                            (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                            ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                        )
                        ELSE 0
                    END AS performance_score
                FROM continent_tick_2hour c
                WHERE (p_region_id IS NULL OR c."continentCode" = p_region_id)
                    AND c.time_bucket >= start_time
                    AND c.time_bucket <= end_time
                GROUP BY c."continentCode";
            END IF;

        WHEN 'country' THEN
            -- Country statistics (similar structure)
            IF end_time - start_time <= INTERVAL '24 hours' THEN
                RETURN QUERY
                SELECT 
                    p_region_type AS region_type,
                    c."countryCode"::TEXT AS region_id,
                    COALESCE(SUM(c.total_ticks), 0)::BIGINT AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0)::BIGINT AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0)::BIGINT AS failed_checks,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS uptime_percentage,
                    ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_response_time,
                    ROUND(MIN(c.min_latency)::NUMERIC, 2) AS min_response_time,
                    ROUND(MAX(c.max_latency)::NUMERIC, 2) AS max_response_time,
                    ROUND(AVG(c.p95_latency)::NUMERIC, 2) AS p95_response_time,
                    ROUND(AVG(c.median_latency)::NUMERIC, 2) AS median_response_time,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND(
                            (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                            ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                        )
                        ELSE 0
                    END AS performance_score
                FROM country_tick_5min c
                WHERE (p_region_id IS NULL OR c."countryCode" = p_region_id)
                    AND c.time_bucket >= start_time
                    AND c.time_bucket <= end_time
                GROUP BY c."countryCode";
                
            ELSIF end_time - start_time <= INTERVAL '7 days' THEN
                RETURN QUERY
                SELECT 
                    p_region_type AS region_type,
                    c."countryCode"::TEXT AS region_id,
                    COALESCE(SUM(c.total_ticks), 0)::BIGINT AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0)::BIGINT AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0)::BIGINT AS failed_checks,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS uptime_percentage,
                    ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_response_time,
                    ROUND(MIN(c.min_latency)::NUMERIC, 2) AS min_response_time,
                    ROUND(MAX(c.max_latency)::NUMERIC, 2) AS max_response_time,
                    ROUND(AVG(c.p95_latency)::NUMERIC, 2) AS p95_response_time,
                    ROUND(AVG(c.median_latency)::NUMERIC, 2) AS median_response_time,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND(
                            (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                            ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                        )
                        ELSE 0
                    END AS performance_score
                FROM country_tick_30min c
                WHERE (p_region_id IS NULL OR c."countryCode" = p_region_id)
                    AND c.time_bucket >= start_time
                    AND c.time_bucket <= end_time
                GROUP BY c."countryCode";
                
            ELSE
                RETURN QUERY
                SELECT 
                    p_region_type AS region_type,
                    c."countryCode"::TEXT AS region_id,
                    COALESCE(SUM(c.total_ticks), 0)::BIGINT AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0)::BIGINT AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0)::BIGINT AS failed_checks,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS uptime_percentage,
                    ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_response_time,
                    ROUND(MIN(c.min_latency)::NUMERIC, 2) AS min_response_time,
                    ROUND(MAX(c.max_latency)::NUMERIC, 2) AS max_response_time,
                    ROUND(AVG(c.p95_latency)::NUMERIC, 2) AS p95_response_time,
                    ROUND(AVG(c.median_latency)::NUMERIC, 2) AS median_response_time,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND(
                            (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                            ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                        )
                        ELSE 0
                    END AS performance_score
                FROM country_tick_2hour c
                WHERE (p_region_id IS NULL OR c."countryCode" = p_region_id)
                    AND c.time_bucket >= start_time
                    AND c.time_bucket <= end_time
                GROUP BY c."countryCode";
            END IF;

        WHEN 'city' THEN
            -- City statistics
            IF end_time - start_time <= INTERVAL '24 hours' THEN
                RETURN QUERY
                SELECT 
                    p_region_type AS region_type,
                    CONCAT(c.city, ', ', c."countryCode")::TEXT AS region_id,
                    COALESCE(SUM(c.total_ticks), 0)::BIGINT AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0)::BIGINT AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0)::BIGINT AS failed_checks,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS uptime_percentage,
                    ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_response_time,
                    ROUND(MIN(c.min_latency)::NUMERIC, 2) AS min_response_time,
                    ROUND(MAX(c.max_latency)::NUMERIC, 2) AS max_response_time,
                    ROUND(AVG(c.p95_latency)::NUMERIC, 2) AS p95_response_time,
                    ROUND(AVG(c.median_latency)::NUMERIC, 2) AS median_response_time,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND(
                            (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                            ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                        )
                        ELSE 0
                    END AS performance_score
                FROM city_tick_5min c
                WHERE (p_region_id IS NULL OR CONCAT(c.city, ', ', c."countryCode") = p_region_id)
                    AND c.time_bucket >= start_time
                    AND c.time_bucket <= end_time
                GROUP BY c.city, c."countryCode";
                
            ELSIF end_time - start_time <= INTERVAL '7 days' THEN
                RETURN QUERY
                SELECT 
                    p_region_type AS region_type,
                    CONCAT(c.city, ', ', c."countryCode")::TEXT AS region_id,
                    COALESCE(SUM(c.total_ticks), 0)::BIGINT AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0)::BIGINT AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0)::BIGINT AS failed_checks,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS uptime_percentage,
                    ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_response_time,
                    ROUND(MIN(c.min_latency)::NUMERIC, 2) AS min_response_time,
                    ROUND(MAX(c.max_latency)::NUMERIC, 2) AS max_response_time,
                    ROUND(AVG(c.p95_latency)::NUMERIC, 2) AS p95_response_time,
                    ROUND(AVG(c.median_latency)::NUMERIC, 2) AS median_response_time,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND(
                            (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                            ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                        )
                        ELSE 0
                    END AS performance_score
                FROM city_tick_30min c
                WHERE (p_region_id IS NULL OR CONCAT(c.city, ', ', c."countryCode") = p_region_id)
                    AND c.time_bucket >= start_time
                    AND c.time_bucket <= end_time
                GROUP BY c.city, c."countryCode";
                
            ELSE
                RETURN QUERY
                SELECT 
                    p_region_type AS region_type,
                    CONCAT(c.city, ', ', c."countryCode")::TEXT AS region_id,
                    COALESCE(SUM(c.total_ticks), 0)::BIGINT AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0)::BIGINT AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0)::BIGINT AS failed_checks,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS uptime_percentage,
                    ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_response_time,
                    ROUND(MIN(c.min_latency)::NUMERIC, 2) AS min_response_time,
                    ROUND(MAX(c.max_latency)::NUMERIC, 2) AS max_response_time,
                    ROUND(AVG(c.p95_latency)::NUMERIC, 2) AS p95_response_time,
                    ROUND(AVG(c.median_latency)::NUMERIC, 2) AS median_response_time,
                    CASE 
                        WHEN SUM(c.total_ticks) > 0 
                        THEN ROUND(
                            (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                            ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                        )
                        ELSE 0
                    END AS performance_score
                FROM city_tick_2hour c
                WHERE (p_region_id IS NULL OR CONCAT(c.city, ', ', c."countryCode") = p_region_id)
                    AND c.time_bucket >= start_time
                    AND c.time_bucket <= end_time
                GROUP BY c.city, c."countryCode";
            END IF;
        ELSE
            RAISE EXCEPTION 'Invalid region_type. Use: continent, country, or city';
    END CASE;
END;
$$ LANGUAGE plpgsql;


-- LET THESE DEBUG QUERIES BE THERE AT THE END OF FILE COMMENTED OUT

-- Original monitor-specific queries
-- SELECT * FROM get_total_avg_latency('01a06e1f-df5b-41c8-a827-f2780df04e89', 'day')
-- SELECT * FROM get_monitor_timeseries('01a06e1f-df5b-41c8-a827-f2780df04e89', 'day')
-- CALL refresh_continuous_aggregate('monitor_tick_5min', NULL, NULL);

-- Regional Analytics Debug Queries

-- Test Continental Analytics Functions
-- SELECT * FROM get_continent_timeseries();                                    -- All continents, day view
-- SELECT * FROM get_continent_timeseries('NA', 'day');                         -- North America, day view
-- SELECT * FROM get_continent_timeseries(NULL, 'week');                        -- All continents, week view
-- SELECT * FROM get_continent_timeseries('EU', 'month');                       -- Europe, month view
-- SELECT * FROM get_continent_timeseries('AS', 'day', '2025-01-01', '2025-01-02'); -- Asia, custom range

-- Test Country Analytics Functions  
-- SELECT * FROM get_country_timeseries();                                      -- All countries, day view
-- SELECT * FROM get_country_timeseries('US', 'day');                           -- USA, day view
-- SELECT * FROM get_country_timeseries(NULL, 'week');                          -- All countries, week view
-- SELECT * FROM get_country_timeseries('GB', 'month');                         -- UK, month view
-- SELECT * FROM get_country_timeseries('DE', 'day', '2025-01-01', '2025-01-02'); -- Germany, custom range

-- Test City Analytics Functions
-- SELECT * FROM get_city_timeseries();                                         -- All cities, day view
-- SELECT * FROM get_city_timeseries('New York', 'US', 'day');                  -- New York, day view  
-- SELECT * FROM get_city_timeseries(NULL, 'GB', 'week');                       -- All UK cities, week view
-- SELECT * FROM get_city_timeseries('Tokyo', NULL, 'month');                   -- Tokyo (any country), month view
-- SELECT * FROM get_city_timeseries('Paris', 'FR', 'day', '2025-01-01', '2025-01-02'); -- Paris, custom range

-- Test Best/Worst Performing Regions
-- SELECT * FROM get_best_performing_regions('continent', 'day', 5);            -- Top 5 continents today
-- SELECT * FROM get_best_performing_regions('country', 'week', 10);            -- Top 10 countries this week
-- SELECT * FROM get_best_performing_regions('city', 'month', 15);              -- Top 15 cities this month

-- SELECT * FROM get_worst_performing_regions('continent', 'day', 3);           -- Bottom 3 continents today
-- SELECT * FROM get_worst_performing_regions('country', 'week', 5);            -- Bottom 5 countries this week
-- SELECT * FROM get_worst_performing_regions('city', 'month', 10);             -- Bottom 10 cities this month

-- Test Continuous Aggregate Refresh (Regional)
-- CALL refresh_continuous_aggregate('continent_tick_5min', NULL, NULL);
-- CALL refresh_continuous_aggregate('continent_tick_30min', NULL, NULL);
-- CALL refresh_continuous_aggregate('continent_tick_2hour', NULL, NULL);

-- CALL refresh_continuous_aggregate('country_tick_5min', NULL, NULL);
-- CALL refresh_continuous_aggregate('country_tick_30min', NULL, NULL);
-- CALL refresh_continuous_aggregate('country_tick_2hour', NULL, NULL);

-- CALL refresh_continuous_aggregate('city_tick_5min', NULL, NULL);
-- CALL refresh_continuous_aggregate('city_tick_30min', NULL, NULL);
-- CALL refresh_continuous_aggregate('city_tick_2hour', NULL, NULL);

-- Check Regional Aggregates Data
-- SELECT "continentCode", COUNT(*), MIN(time_bucket), MAX(time_bucket) FROM continent_tick_5min GROUP BY "continentCode";
-- SELECT "countryCode", COUNT(*), MIN(time_bucket), MAX(time_bucket) FROM country_tick_5min GROUP BY "countryCode";
-- SELECT city, "countryCode", COUNT(*), MIN(time_bucket), MAX(time_bucket) FROM city_tick_5min GROUP BY city, "countryCode";

-- Performance Testing Queries
-- EXPLAIN ANALYZE SELECT * FROM get_continent_timeseries('NA', 'day');
-- EXPLAIN ANALYZE SELECT * FROM get_regional_performance_ranking('country', 'week');
-- EXPLAIN ANALYZE SELECT * FROM get_best_performing_regions('city', 'month', 20);

-- TimescaleDB System Queries
-- SELECT * FROM pg_stat_activity WHERE application_name LIKE '%timescale%';
-- SELECT _timescaledb_functions.restart_background_workers();
-- SELECT * FROM pg_extension WHERE extname = 'timescaledb';
-- SELECT * FROM timescaledb_information.jobs;
-- SHOW timescaledb.max_background_workers;
-- SHOW max_worker_processes;
-- SHOW shared_preload_libraries;
-- SELECT * FROM pg_stat_activity WHERE backend_type = 'background worker';

-- Run specific jobs for regional aggregates (job IDs will be different in your setup)
-- CALL run_job(1007);  -- continent_tick_5min
-- CALL run_job(1008);  -- continent_tick_30min  
-- CALL run_job(1009);  -- continent_tick_2hour
-- CALL run_job(1010);  -- country_tick_5min
-- CALL run_job(1011);  -- country_tick_30min
-- CALL run_job(1012);  -- country_tick_2hour
-- CALL run_job(1013);  -- city_tick_5min
-- CALL run_job(1014);  -- city_tick_30min
-- CALL run_job(1015);  -- city_tick_2hour

-- Data validation queries
-- SELECT COUNT(*), MIN("createdAt"), MAX("createdAt") 
-- FROM "MonitorTick" 
-- WHERE "monitorId" = '01a06e1f-df5b-41c8-a827-f2780df04e89' 
-- AND "createdAt" >= '2025-08-22 20:00:00+00';

-- SELECT COUNT(*), MIN("createdAt"), MAX("createdAt") 
-- FROM "MonitorTick" 
-- WHERE "monitorId" = '01a06e1f-df5b-41c8-a827-f2780df04e89' 
-- AND "createdAt" >= NOW() - INTERVAL '1 hour';

-- Refresh specific time ranges
-- CALL refresh_continuous_aggregate('monitor_tick_5min', 
--     '2025-08-22 19:00:00+00', 
--     '2025-08-22 20:00:00+00'
-- );

-- For changing the timezone
-- ALTER SYSTEM SET timezone = 'Asia/Karachi';
-- SELECT pg_reload_conf();