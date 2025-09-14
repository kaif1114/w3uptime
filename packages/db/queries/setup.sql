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

-- 4. Create refresh policies for continuous aggregates
-- Refresh every 30 seconds for 5-minute aggregate (for near real-time updates)
SELECT add_continuous_aggregate_policy('monitor_tick_5min',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '30 seconds',
    if_not_exists => TRUE);

-- a little more optimized but includes the lag
-- SELECT add_continuous_aggregate_policy('monitor_tick_5min',
--     start_offset => INTERVAL '1 hour',
--     end_offset => INTERVAL '2 minutes',
--     schedule_interval => INTERVAL '1 minutes',
--     if_not_exists => TRUE);

-- Refresh every 5 minutes for 30-minute aggregate
SELECT add_continuous_aggregate_policy('monitor_tick_30min',
    start_offset => INTERVAL '6 hours', 
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes',
    if_not_exists => TRUE);

-- Refresh every 15 minutes for 2-hour aggregate
SELECT add_continuous_aggregate_policy('monitor_tick_2hour',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '15 minutes', 
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE);

-- Regional continuous aggregates refresh policies

-- Continental aggregates refresh policies
SELECT add_continuous_aggregate_policy('continent_tick_5min',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '30 seconds',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('continent_tick_30min',
    start_offset => INTERVAL '6 hours', 
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('continent_tick_2hour',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '15 minutes', 
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE);

-- Country aggregates refresh policies
SELECT add_continuous_aggregate_policy('country_tick_5min',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '30 seconds',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('country_tick_30min',
    start_offset => INTERVAL '6 hours', 
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('country_tick_2hour',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '15 minutes', 
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE);

-- City aggregates refresh policies
SELECT add_continuous_aggregate_policy('city_tick_5min',
    start_offset => INTERVAL '1 hour',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '30 seconds',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('city_tick_30min',
    start_offset => INTERVAL '6 hours', 
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('city_tick_2hour',
    start_offset => INTERVAL '1 day',
    end_offset => INTERVAL '15 minutes', 
    schedule_interval => INTERVAL '15 minutes',
    if_not_exists => TRUE);

-- 5. Create regional continuous aggregates for analytics

-- 5a. Continental continuous aggregates

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
                COALESCE(SUM(monitor_tick_5min.total_ticks), 0) as total_checks,
                COALESCE(SUM(monitor_tick_5min.successful_ticks), 0) as successful_checks,
                COALESCE(SUM(monitor_tick_5min.total_ticks - monitor_tick_5min.successful_ticks), 0) as failed_checks,
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
                COALESCE(SUM(monitor_tick_30min.total_ticks), 0) as total_checks,
                COALESCE(SUM(monitor_tick_30min.successful_ticks), 0) as successful_checks,
                COALESCE(SUM(monitor_tick_30min.total_ticks - monitor_tick_30min.successful_ticks), 0) as failed_checks,
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
                COALESCE(SUM(monitor_tick_2hour.total_ticks), 0) as total_checks,
                COALESCE(SUM(monitor_tick_2hour.successful_ticks), 0) as successful_checks,
                COALESCE(SUM(monitor_tick_2hour.total_ticks - monitor_tick_2hour.successful_ticks), 0) as failed_checks,
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

-- 7. Regional analytics functions

-- Function to get continental timeseries data
CREATE OR REPLACE FUNCTION get_continent_timeseries(
    p_continent_code TEXT DEFAULT NULL,
    p_period TEXT DEFAULT 'day',
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
    continent_code TEXT,
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
            -- Custom period - use provided times or default to day
            start_time := COALESCE(p_start_time, NOW() - INTERVAL '24 hours');
            end_time := COALESCE(p_end_time, NOW());
    END CASE;

    -- Select appropriate aggregate view based on time span
    IF end_time - start_time <= INTERVAL '24 hours' THEN
        -- Use 5-minute aggregates for periods <= 24 hours
        RETURN QUERY
        SELECT 
            continent_tick_5min."continentCode"::TEXT AS continent_code,
            continent_tick_5min.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(continent_tick_5min.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(continent_tick_5min.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(continent_tick_5min.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(continent_tick_5min.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(continent_tick_5min.p95_latency::NUMERIC, 2) AS p95_latency,
            continent_tick_5min.total_ticks AS total_ticks,
            continent_tick_5min.successful_ticks AS successful_ticks,
            CASE 
                WHEN continent_tick_5min.total_ticks > 0 
                THEN ROUND((continent_tick_5min.successful_ticks::NUMERIC / continent_tick_5min.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM continent_tick_5min
        WHERE (p_continent_code IS NULL OR continent_tick_5min."continentCode" = p_continent_code)
            AND continent_tick_5min.time_bucket >= start_time
            AND continent_tick_5min.time_bucket <= end_time
        ORDER BY continent_tick_5min.time_bucket ASC, continent_tick_5min."continentCode" ASC;
            
    ELSIF end_time - start_time <= INTERVAL '7 days' THEN
        -- Use 30-minute aggregates for periods <= 7 days
        RETURN QUERY
        SELECT 
            continent_tick_30min."continentCode"::TEXT AS continent_code,
            continent_tick_30min.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(continent_tick_30min.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(continent_tick_30min.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(continent_tick_30min.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(continent_tick_30min.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(continent_tick_30min.p95_latency::NUMERIC, 2) AS p95_latency,
            continent_tick_30min.total_ticks AS total_ticks,
            continent_tick_30min.successful_ticks AS successful_ticks,
            CASE 
                WHEN continent_tick_30min.total_ticks > 0 
                THEN ROUND((continent_tick_30min.successful_ticks::NUMERIC / continent_tick_30min.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM continent_tick_30min
        WHERE (p_continent_code IS NULL OR continent_tick_30min."continentCode" = p_continent_code)
            AND continent_tick_30min.time_bucket >= start_time
            AND continent_tick_30min.time_bucket <= end_time
        ORDER BY continent_tick_30min.time_bucket ASC, continent_tick_30min."continentCode" ASC;
            
    ELSE
        -- Use 2-hour aggregates for periods > 7 days
        RETURN QUERY
        SELECT 
            continent_tick_2hour."continentCode"::TEXT AS continent_code,
            continent_tick_2hour.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(continent_tick_2hour.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(continent_tick_2hour.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(continent_tick_2hour.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(continent_tick_2hour.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(continent_tick_2hour.p95_latency::NUMERIC, 2) AS p95_latency,
            continent_tick_2hour.total_ticks AS total_ticks,
            continent_tick_2hour.successful_ticks AS successful_ticks,
            CASE 
                WHEN continent_tick_2hour.total_ticks > 0 
                THEN ROUND((continent_tick_2hour.successful_ticks::NUMERIC / continent_tick_2hour.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM continent_tick_2hour
        WHERE (p_continent_code IS NULL OR continent_tick_2hour."continentCode" = p_continent_code)
            AND continent_tick_2hour.time_bucket >= start_time
            AND continent_tick_2hour.time_bucket <= end_time
        ORDER BY continent_tick_2hour.time_bucket ASC, continent_tick_2hour."continentCode" ASC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get country timeseries data
CREATE OR REPLACE FUNCTION get_country_timeseries(
    p_country_code TEXT DEFAULT NULL,
    p_period TEXT DEFAULT 'day',
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
    country_code TEXT,
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

    -- Select appropriate aggregate view based on time span
    IF end_time - start_time <= INTERVAL '24 hours' THEN
        RETURN QUERY
        SELECT 
            country_tick_5min."countryCode"::TEXT AS country_code,
            country_tick_5min.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(country_tick_5min.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(country_tick_5min.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(country_tick_5min.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(country_tick_5min.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(country_tick_5min.p95_latency::NUMERIC, 2) AS p95_latency,
            country_tick_5min.total_ticks AS total_ticks,
            country_tick_5min.successful_ticks AS successful_ticks,
            CASE 
                WHEN country_tick_5min.total_ticks > 0 
                THEN ROUND((country_tick_5min.successful_ticks::NUMERIC / country_tick_5min.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM country_tick_5min
        WHERE (p_country_code IS NULL OR country_tick_5min."countryCode" = p_country_code)
            AND country_tick_5min.time_bucket >= start_time
            AND country_tick_5min.time_bucket <= end_time
        ORDER BY country_tick_5min.time_bucket ASC, country_tick_5min."countryCode" ASC;
            
    ELSIF end_time - start_time <= INTERVAL '7 days' THEN
        RETURN QUERY
        SELECT 
            country_tick_30min."countryCode"::TEXT AS country_code,
            country_tick_30min.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(country_tick_30min.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(country_tick_30min.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(country_tick_30min.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(country_tick_30min.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(country_tick_30min.p95_latency::NUMERIC, 2) AS p95_latency,
            country_tick_30min.total_ticks AS total_ticks,
            country_tick_30min.successful_ticks AS successful_ticks,
            CASE 
                WHEN country_tick_30min.total_ticks > 0 
                THEN ROUND((country_tick_30min.successful_ticks::NUMERIC / country_tick_30min.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM country_tick_30min
        WHERE (p_country_code IS NULL OR country_tick_30min."countryCode" = p_country_code)
            AND country_tick_30min.time_bucket >= start_time
            AND country_tick_30min.time_bucket <= end_time
        ORDER BY country_tick_30min.time_bucket ASC, country_tick_30min."countryCode" ASC;
            
    ELSE
        RETURN QUERY
        SELECT 
            country_tick_2hour."countryCode"::TEXT AS country_code,
            country_tick_2hour.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(country_tick_2hour.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(country_tick_2hour.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(country_tick_2hour.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(country_tick_2hour.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(country_tick_2hour.p95_latency::NUMERIC, 2) AS p95_latency,
            country_tick_2hour.total_ticks AS total_ticks,
            country_tick_2hour.successful_ticks AS successful_ticks,
            CASE 
                WHEN country_tick_2hour.total_ticks > 0 
                THEN ROUND((country_tick_2hour.successful_ticks::NUMERIC / country_tick_2hour.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM country_tick_2hour
        WHERE (p_country_code IS NULL OR country_tick_2hour."countryCode" = p_country_code)
            AND country_tick_2hour.time_bucket >= start_time
            AND country_tick_2hour.time_bucket <= end_time
        ORDER BY country_tick_2hour.time_bucket ASC, country_tick_2hour."countryCode" ASC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get city timeseries data
CREATE OR REPLACE FUNCTION get_city_timeseries(
    p_city_name TEXT DEFAULT NULL,
    p_country_code TEXT DEFAULT NULL,
    p_period TEXT DEFAULT 'day',
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL
) RETURNS TABLE (
    city_name TEXT,
    country_code TEXT,
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

    -- Select appropriate aggregate view based on time span
    IF end_time - start_time <= INTERVAL '24 hours' THEN
        RETURN QUERY
        SELECT 
            city_tick_5min.city::TEXT AS city_name,
            city_tick_5min."countryCode"::TEXT AS country_code,
            city_tick_5min.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(city_tick_5min.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(city_tick_5min.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(city_tick_5min.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(city_tick_5min.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(city_tick_5min.p95_latency::NUMERIC, 2) AS p95_latency,
            city_tick_5min.total_ticks AS total_ticks,
            city_tick_5min.successful_ticks AS successful_ticks,
            CASE 
                WHEN city_tick_5min.total_ticks > 0 
                THEN ROUND((city_tick_5min.successful_ticks::NUMERIC / city_tick_5min.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM city_tick_5min
        WHERE (p_city_name IS NULL OR city_tick_5min.city = p_city_name)
            AND (p_country_code IS NULL OR city_tick_5min."countryCode" = p_country_code)
            AND city_tick_5min.time_bucket >= start_time
            AND city_tick_5min.time_bucket <= end_time
        ORDER BY city_tick_5min.time_bucket ASC, city_tick_5min.city ASC, city_tick_5min."countryCode" ASC;
            
    ELSIF end_time - start_time <= INTERVAL '7 days' THEN
        RETURN QUERY
        SELECT 
            city_tick_30min.city::TEXT AS city_name,
            city_tick_30min."countryCode"::TEXT AS country_code,
            city_tick_30min.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(city_tick_30min.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(city_tick_30min.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(city_tick_30min.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(city_tick_30min.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(city_tick_30min.p95_latency::NUMERIC, 2) AS p95_latency,
            city_tick_30min.total_ticks AS total_ticks,
            city_tick_30min.successful_ticks AS successful_ticks,
            CASE 
                WHEN city_tick_30min.total_ticks > 0 
                THEN ROUND((city_tick_30min.successful_ticks::NUMERIC / city_tick_30min.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM city_tick_30min
        WHERE (p_city_name IS NULL OR city_tick_30min.city = p_city_name)
            AND (p_country_code IS NULL OR city_tick_30min."countryCode" = p_country_code)
            AND city_tick_30min.time_bucket >= start_time
            AND city_tick_30min.time_bucket <= end_time
        ORDER BY city_tick_30min.time_bucket ASC, city_tick_30min.city ASC, city_tick_30min."countryCode" ASC;
            
    ELSE
        RETURN QUERY
        SELECT 
            city_tick_2hour.city::TEXT AS city_name,
            city_tick_2hour."countryCode"::TEXT AS country_code,
            city_tick_2hour.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(city_tick_2hour.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(city_tick_2hour.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(city_tick_2hour.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(city_tick_2hour.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(city_tick_2hour.p95_latency::NUMERIC, 2) AS p95_latency,
            city_tick_2hour.total_ticks AS total_ticks,
            city_tick_2hour.successful_ticks AS successful_ticks,
            CASE 
                WHEN city_tick_2hour.total_ticks > 0 
                THEN ROUND((city_tick_2hour.successful_ticks::NUMERIC / city_tick_2hour.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM city_tick_2hour
        WHERE (p_city_name IS NULL OR city_tick_2hour.city = p_city_name)
            AND (p_country_code IS NULL OR city_tick_2hour."countryCode" = p_country_code)
            AND city_tick_2hour.time_bucket >= start_time
            AND city_tick_2hour.time_bucket <= end_time
        ORDER BY city_tick_2hour.time_bucket ASC, city_tick_2hour.city ASC, city_tick_2hour."countryCode" ASC;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get regional performance ranking
CREATE OR REPLACE FUNCTION get_regional_performance_ranking(
    p_region_type TEXT DEFAULT 'continent', -- 'continent', 'country', 'city'
    p_period TEXT DEFAULT 'day',
    p_start_time TIMESTAMPTZ DEFAULT NULL,
    p_end_time TIMESTAMPTZ DEFAULT NULL,
    p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
    region_id TEXT,
    region_name TEXT,
    avg_latency NUMERIC,
    success_rate NUMERIC,
    total_checks BIGINT,
    performance_score NUMERIC,
    rank_position BIGINT
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
                WITH regional_stats AS (
                    SELECT 
                        c."continentCode"::TEXT AS region_id,
                        c."continentCode"::TEXT AS region_name,
                        ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_latency,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate,
                        SUM(c.total_ticks) AS total_checks,
                        -- Performance score: (success_rate * 0.6) + (100 - normalized_latency * 0.4)
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND(
                                (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                                ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                            )
                            ELSE 0
                        END AS performance_score
                    FROM continent_tick_5min c
                    WHERE c.time_bucket >= start_time
                        AND c.time_bucket <= end_time
                    GROUP BY c."continentCode"
                    HAVING SUM(c.total_ticks) > 0
                )
                SELECT 
                    rs.region_id,
                    rs.region_name,
                    rs.avg_latency,
                    rs.success_rate,
                    rs.total_checks,
                    rs.performance_score,
                    ROW_NUMBER() OVER (ORDER BY rs.performance_score DESC, rs.avg_latency ASC) AS rank_position
                FROM regional_stats rs
                ORDER BY rs.performance_score DESC, rs.avg_latency ASC
                LIMIT p_limit;
                
            ELSIF end_time - start_time <= INTERVAL '7 days' THEN
                RETURN QUERY
                WITH regional_stats AS (
                    SELECT 
                        c."continentCode"::TEXT AS region_id,
                        c."continentCode"::TEXT AS region_name,
                        ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_latency,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate,
                        SUM(c.total_ticks) AS total_checks,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND(
                                (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                                ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                            )
                            ELSE 0
                        END AS performance_score
                    FROM continent_tick_30min c
                    WHERE c.time_bucket >= start_time
                        AND c.time_bucket <= end_time
                    GROUP BY c."continentCode"
                    HAVING SUM(c.total_ticks) > 0
                )
                SELECT 
                    rs.region_id,
                    rs.region_name,
                    rs.avg_latency,
                    rs.success_rate,
                    rs.total_checks,
                    rs.performance_score,
                    ROW_NUMBER() OVER (ORDER BY rs.performance_score DESC, rs.avg_latency ASC) AS rank_position
                FROM regional_stats rs
                ORDER BY rs.performance_score DESC, rs.avg_latency ASC
                LIMIT p_limit;
                
            ELSE
                RETURN QUERY
                WITH regional_stats AS (
                    SELECT 
                        c."continentCode"::TEXT AS region_id,
                        c."continentCode"::TEXT AS region_name,
                        ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_latency,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate,
                        SUM(c.total_ticks) AS total_checks,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND(
                                (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                                ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                            )
                            ELSE 0
                        END AS performance_score
                    FROM continent_tick_2hour c
                    WHERE c.time_bucket >= start_time
                        AND c.time_bucket <= end_time
                    GROUP BY c."continentCode"
                    HAVING SUM(c.total_ticks) > 0
                )
                SELECT 
                    rs.region_id,
                    rs.region_name,
                    rs.avg_latency,
                    rs.success_rate,
                    rs.total_checks,
                    rs.performance_score,
                    ROW_NUMBER() OVER (ORDER BY rs.performance_score DESC, rs.avg_latency ASC) AS rank_position
                FROM regional_stats rs
                ORDER BY rs.performance_score DESC, rs.avg_latency ASC
                LIMIT p_limit;
            END IF;

        WHEN 'country' THEN
            -- Country performance ranking (similar structure for countries)
            IF end_time - start_time <= INTERVAL '24 hours' THEN
                RETURN QUERY
                WITH regional_stats AS (
                    SELECT 
                        c."countryCode"::TEXT AS region_id,
                        c."countryCode"::TEXT AS region_name,
                        ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_latency,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate,
                        SUM(c.total_ticks) AS total_checks,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND(
                                (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                                ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                            )
                            ELSE 0
                        END AS performance_score
                    FROM country_tick_5min c
                    WHERE c.time_bucket >= start_time
                        AND c.time_bucket <= end_time
                    GROUP BY c."countryCode"
                    HAVING SUM(c.total_ticks) > 0
                )
                SELECT 
                    rs.region_id,
                    rs.region_name,
                    rs.avg_latency,
                    rs.success_rate,
                    rs.total_checks,
                    rs.performance_score,
                    ROW_NUMBER() OVER (ORDER BY rs.performance_score DESC, rs.avg_latency ASC) AS rank_position
                FROM regional_stats rs
                ORDER BY rs.performance_score DESC, rs.avg_latency ASC
                LIMIT p_limit;
                
            ELSIF end_time - start_time <= INTERVAL '7 days' THEN
                RETURN QUERY
                WITH regional_stats AS (
                    SELECT 
                        c."countryCode"::TEXT AS region_id,
                        c."countryCode"::TEXT AS region_name,
                        ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_latency,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate,
                        SUM(c.total_ticks) AS total_checks,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND(
                                (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                                ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                            )
                            ELSE 0
                        END AS performance_score
                    FROM country_tick_30min c
                    WHERE c.time_bucket >= start_time
                        AND c.time_bucket <= end_time
                    GROUP BY c."countryCode"
                    HAVING SUM(c.total_ticks) > 0
                )
                SELECT 
                    rs.region_id,
                    rs.region_name,
                    rs.avg_latency,
                    rs.success_rate,
                    rs.total_checks,
                    rs.performance_score,
                    ROW_NUMBER() OVER (ORDER BY rs.performance_score DESC, rs.avg_latency ASC) AS rank_position
                FROM regional_stats rs
                ORDER BY rs.performance_score DESC, rs.avg_latency ASC
                LIMIT p_limit;
                
            ELSE
                RETURN QUERY
                WITH regional_stats AS (
                    SELECT 
                        c."countryCode"::TEXT AS region_id,
                        c."countryCode"::TEXT AS region_name,
                        ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_latency,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate,
                        SUM(c.total_ticks) AS total_checks,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND(
                                (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                                ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                            )
                            ELSE 0
                        END AS performance_score
                    FROM country_tick_2hour c
                    WHERE c.time_bucket >= start_time
                        AND c.time_bucket <= end_time
                    GROUP BY c."countryCode"
                    HAVING SUM(c.total_ticks) > 0
                )
                SELECT 
                    rs.region_id,
                    rs.region_name,
                    rs.avg_latency,
                    rs.success_rate,
                    rs.total_checks,
                    rs.performance_score,
                    ROW_NUMBER() OVER (ORDER BY rs.performance_score DESC, rs.avg_latency ASC) AS rank_position
                FROM regional_stats rs
                ORDER BY rs.performance_score DESC, rs.avg_latency ASC
                LIMIT p_limit;
            END IF;

        WHEN 'city' THEN
            -- City performance ranking
            IF end_time - start_time <= INTERVAL '24 hours' THEN
                RETURN QUERY
                WITH regional_stats AS (
                    SELECT 
                        CONCAT(c.city, ', ', c."countryCode")::TEXT AS region_id,
                        c.city::TEXT AS region_name,
                        ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_latency,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate,
                        SUM(c.total_ticks) AS total_checks,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND(
                                (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                                ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                            )
                            ELSE 0
                        END AS performance_score
                    FROM city_tick_5min c
                    WHERE c.time_bucket >= start_time
                        AND c.time_bucket <= end_time
                    GROUP BY c.city, c."countryCode"
                    HAVING SUM(c.total_ticks) > 0
                )
                SELECT 
                    rs.region_id,
                    rs.region_name,
                    rs.avg_latency,
                    rs.success_rate,
                    rs.total_checks,
                    rs.performance_score,
                    ROW_NUMBER() OVER (ORDER BY rs.performance_score DESC, rs.avg_latency ASC) AS rank_position
                FROM regional_stats rs
                ORDER BY rs.performance_score DESC, rs.avg_latency ASC
                LIMIT p_limit;
                
            ELSIF end_time - start_time <= INTERVAL '7 days' THEN
                RETURN QUERY
                WITH regional_stats AS (
                    SELECT 
                        CONCAT(c.city, ', ', c."countryCode")::TEXT AS region_id,
                        c.city::TEXT AS region_name,
                        ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_latency,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate,
                        SUM(c.total_ticks) AS total_checks,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND(
                                (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                                ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                            )
                            ELSE 0
                        END AS performance_score
                    FROM city_tick_30min c
                    WHERE c.time_bucket >= start_time
                        AND c.time_bucket <= end_time
                    GROUP BY c.city, c."countryCode"
                    HAVING SUM(c.total_ticks) > 0
                )
                SELECT 
                    rs.region_id,
                    rs.region_name,
                    rs.avg_latency,
                    rs.success_rate,
                    rs.total_checks,
                    rs.performance_score,
                    ROW_NUMBER() OVER (ORDER BY rs.performance_score DESC, rs.avg_latency ASC) AS rank_position
                FROM regional_stats rs
                ORDER BY rs.performance_score DESC, rs.avg_latency ASC
                LIMIT p_limit;
                
            ELSE
                RETURN QUERY
                WITH regional_stats AS (
                    SELECT 
                        CONCAT(c.city, ', ', c."countryCode")::TEXT AS region_id,
                        c.city::TEXT AS region_name,
                        ROUND(AVG(c.avg_latency)::NUMERIC, 2) AS avg_latency,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100, 2)
                            ELSE 0
                        END AS success_rate,
                        SUM(c.total_ticks) AS total_checks,
                        CASE 
                            WHEN SUM(c.total_ticks) > 0 
                            THEN ROUND(
                                (((SUM(c.successful_ticks)::NUMERIC / SUM(c.total_ticks)::NUMERIC) * 100) * 0.6) +
                                ((100 - LEAST(AVG(c.avg_latency) / 10, 100)) * 0.4), 2
                            )
                            ELSE 0
                        END AS performance_score
                    FROM city_tick_2hour c
                    WHERE c.time_bucket >= start_time
                        AND c.time_bucket <= end_time
                    GROUP BY c.city, c."countryCode"
                    HAVING SUM(c.total_ticks) > 0
                )
                SELECT 
                    rs.region_id,
                    rs.region_name,
                    rs.avg_latency,
                    rs.success_rate,
                    rs.total_checks,
                    rs.performance_score,
                    ROW_NUMBER() OVER (ORDER BY rs.performance_score DESC, rs.avg_latency ASC) AS rank_position
                FROM regional_stats rs
                ORDER BY rs.performance_score DESC, rs.avg_latency ASC
                LIMIT p_limit;
            END IF;
        ELSE
            RAISE EXCEPTION 'Invalid region_type. Use: continent, country, or city';
    END CASE;
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
                    COALESCE(SUM(c.total_ticks), 0) AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0) AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0) AS failed_checks,
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
                    COALESCE(SUM(c.total_ticks), 0) AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0) AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0) AS failed_checks,
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
                    COALESCE(SUM(c.total_ticks), 0) AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0) AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0) AS failed_checks,
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
                    COALESCE(SUM(c.total_ticks), 0) AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0) AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0) AS failed_checks,
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
                    COALESCE(SUM(c.total_ticks), 0) AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0) AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0) AS failed_checks,
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
                    COALESCE(SUM(c.total_ticks), 0) AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0) AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0) AS failed_checks,
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
                    COALESCE(SUM(c.total_ticks), 0) AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0) AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0) AS failed_checks,
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
                    COALESCE(SUM(c.total_ticks), 0) AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0) AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0) AS failed_checks,
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
                    COALESCE(SUM(c.total_ticks), 0) AS total_checks,
                    COALESCE(SUM(c.successful_ticks), 0) AS successful_checks,
                    COALESCE(SUM(c.total_ticks - c.successful_ticks), 0) AS failed_checks,
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

-- Test Regional Performance Ranking
-- SELECT * FROM get_regional_performance_ranking('continent', 'day');          -- Best continents today
-- SELECT * FROM get_regional_performance_ranking('country', 'week', NULL, NULL, 15); -- Best countries this week (top 15)
-- SELECT * FROM get_regional_performance_ranking('city', 'month');             -- Best cities this month
-- SELECT * FROM get_regional_performance_ranking('continent', 'day', '2025-01-01', '2025-01-02'); -- Continents for custom range

-- Test Best/Worst Performing Regions
-- SELECT * FROM get_best_performing_regions('continent', 'day', 5);            -- Top 5 continents today
-- SELECT * FROM get_best_performing_regions('country', 'week', 10);            -- Top 10 countries this week
-- SELECT * FROM get_best_performing_regions('city', 'month', 15);              -- Top 15 cities this month

-- SELECT * FROM get_worst_performing_regions('continent', 'day', 3);           -- Bottom 3 continents today
-- SELECT * FROM get_worst_performing_regions('country', 'week', 5);            -- Bottom 5 countries this week
-- SELECT * FROM get_worst_performing_regions('city', 'month', 10);             -- Bottom 10 cities this month

-- Test Regional Statistics
-- SELECT * FROM get_regional_stats('continent');                               -- All continent stats today
-- SELECT * FROM get_regional_stats('country', 'US', 'week');                   -- USA stats this week
-- SELECT * FROM get_regional_stats('city', 'London, GB', 'month');             -- London stats this month
-- SELECT * FROM get_regional_stats('continent', 'NA', 'day', '2025-01-01', '2025-01-02'); -- North America custom range

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