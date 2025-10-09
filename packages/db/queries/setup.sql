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

    -- 3d. Regional continuous aggregates for country-level data

    -- 5-minute country-level continuous aggregate
    CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_tick_country_5min
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

    -- 30-minute country-level continuous aggregate
    CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_tick_country_30min
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

    -- 2-hour country-level continuous aggregate
    CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_tick_country_2hour
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

    -- 3e. Regional continuous aggregates for continent-level data

    -- 5-minute continent-level continuous aggregate
    CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_tick_continent_5min
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

    -- 30-minute continent-level continuous aggregate
    CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_tick_continent_30min
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

    -- 2-hour continent-level continuous aggregate
    CREATE MATERIALIZED VIEW IF NOT EXISTS monitor_tick_continent_2hour
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


-----------------------





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

-- 5. Add refresh policies for regional continuous aggregates

-- Country-level refresh policies
SELECT add_continuous_aggregate_policy('monitor_tick_country_5min',
    start_offset => INTERVAL '25 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('monitor_tick_country_30min',
    start_offset => INTERVAL '8 days', 
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('monitor_tick_country_2hour',
    start_offset => INTERVAL '32 days',
    end_offset => INTERVAL '30 minutes', 
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);

-- Continent-level refresh policies
SELECT add_continuous_aggregate_policy('monitor_tick_continent_5min',
    start_offset => INTERVAL '25 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('monitor_tick_continent_30min',
    start_offset => INTERVAL '8 days', 
    end_offset => INTERVAL '10 minutes',
    schedule_interval => INTERVAL '10 minutes',
    if_not_exists => TRUE);

SELECT add_continuous_aggregate_policy('monitor_tick_continent_2hour',
    start_offset => INTERVAL '32 days',
    end_offset => INTERVAL '30 minutes', 
    schedule_interval => INTERVAL '30 minutes',
    if_not_exists => TRUE);



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

-- Function to get monitor-specific regional data by country
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
                mtc."countryCode"::TEXT AS country_code,
                ROUND(AVG(mtc.avg_latency)::NUMERIC, 2) AS avg_latency,
                SUM(mtc.total_ticks)::BIGINT AS total_ticks,
                SUM(mtc.successful_ticks)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mtc.total_ticks) > 0 
                    THEN ROUND((SUM(mtc.successful_ticks)::NUMERIC / SUM(mtc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_country_5min mtc
            WHERE mtc."monitorId" = p_monitor_id::text
                AND mtc.time_bucket >= NOW() - INTERVAL '24 hours'
                AND mtc."countryCode" IS NOT NULL
            GROUP BY mtc."countryCode";
            
        WHEN 'week' THEN
            RETURN QUERY
            SELECT 
                mtc."countryCode"::TEXT AS country_code,
                ROUND(AVG(mtc.avg_latency)::NUMERIC, 2) AS avg_latency,
                SUM(mtc.total_ticks)::BIGINT AS total_ticks,
                SUM(mtc.successful_ticks)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mtc.total_ticks) > 0 
                    THEN ROUND((SUM(mtc.successful_ticks)::NUMERIC / SUM(mtc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_country_30min mtc
            WHERE mtc."monitorId" = p_monitor_id::text
                AND mtc.time_bucket >= NOW() - INTERVAL '7 days'
                AND mtc."countryCode" IS NOT NULL
            GROUP BY mtc."countryCode";
            
        WHEN 'month' THEN
            RETURN QUERY
            SELECT 
                mtc."countryCode"::TEXT AS country_code,
                ROUND(AVG(mtc.avg_latency)::NUMERIC, 2) AS avg_latency,
                SUM(mtc.total_ticks)::BIGINT AS total_ticks,
                SUM(mtc.successful_ticks)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mtc.total_ticks) > 0 
                    THEN ROUND((SUM(mtc.successful_ticks)::NUMERIC / SUM(mtc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_country_2hour mtc
            WHERE mtc."monitorId" = p_monitor_id::text
                AND mtc.time_bucket >= NOW() - INTERVAL '30 days'
                AND mtc."countryCode" IS NOT NULL
            GROUP BY mtc."countryCode";
        ELSE
            RAISE EXCEPTION 'Invalid period. Use: day, week, or month';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get monitor-specific regional data by continent
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
                mtc."continentCode"::TEXT AS continent_code,
                ROUND(AVG(mtc.avg_latency)::NUMERIC, 2) AS avg_latency,
                SUM(mtc.total_ticks)::BIGINT AS total_ticks,
                SUM(mtc.successful_ticks)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mtc.total_ticks) > 0 
                    THEN ROUND((SUM(mtc.successful_ticks)::NUMERIC / SUM(mtc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_continent_5min mtc
            WHERE mtc."monitorId" = p_monitor_id::text
                AND mtc.time_bucket >= NOW() - INTERVAL '24 hours'
                AND mtc."continentCode" IS NOT NULL
            GROUP BY mtc."continentCode";
            
        WHEN 'week' THEN
            RETURN QUERY
            SELECT 
                mtc."continentCode"::TEXT AS continent_code,
                ROUND(AVG(mtc.avg_latency)::NUMERIC, 2) AS avg_latency,
                SUM(mtc.total_ticks)::BIGINT AS total_ticks,
                SUM(mtc.successful_ticks)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mtc.total_ticks) > 0 
                    THEN ROUND((SUM(mtc.successful_ticks)::NUMERIC / SUM(mtc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_continent_30min mtc
            WHERE mtc."monitorId" = p_monitor_id::text
                AND mtc.time_bucket >= NOW() - INTERVAL '7 days'
                AND mtc."continentCode" IS NOT NULL
            GROUP BY mtc."continentCode";
            
        WHEN 'month' THEN
            RETURN QUERY
            SELECT 
                mtc."continentCode"::TEXT AS continent_code,
                ROUND(AVG(mtc.avg_latency)::NUMERIC, 2) AS avg_latency,
                SUM(mtc.total_ticks)::BIGINT AS total_ticks,
                SUM(mtc.successful_ticks)::BIGINT AS successful_ticks,
                CASE 
                    WHEN SUM(mtc.total_ticks) > 0 
                    THEN ROUND((SUM(mtc.successful_ticks)::NUMERIC / SUM(mtc.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_continent_2hour mtc
            WHERE mtc."monitorId" = p_monitor_id::text
                AND mtc.time_bucket >= NOW() - INTERVAL '30 days'
                AND mtc."continentCode" IS NOT NULL
            GROUP BY mtc."continentCode";
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


-- Debugging queries are commented out at the end of this file for reference


-- Function to get monitor timeseries for a custom time range using continuous aggregates
CREATE OR REPLACE FUNCTION get_monitor_timeseries_range(
    p_monitor_id UUID,
    p_start TIMESTAMPTZ,
    p_end TIMESTAMPTZ
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
DECLARE
    v_duration INTERVAL := p_end - p_start;
BEGIN
    IF v_duration <= INTERVAL '25 hours' THEN
        RETURN QUERY
        SELECT 
            mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
            COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
            COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
            CASE 
                WHEN mt.total_ticks > 0 
                THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM monitor_tick_5min mt
        WHERE mt."monitorId" = p_monitor_id::text
          AND mt.time_bucket >= p_start
          AND mt.time_bucket <= p_end
        ORDER BY mt.time_bucket ASC;
    ELSIF v_duration <= INTERVAL '8 days' THEN
        RETURN QUERY
        SELECT 
            mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
            COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
            COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
            CASE 
                WHEN mt.total_ticks > 0 
                THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM monitor_tick_30min mt
        WHERE mt."monitorId" = p_monitor_id::text
          AND mt.time_bucket >= p_start
          AND mt.time_bucket <= p_end
        ORDER BY mt.time_bucket ASC;
    ELSE
        RETURN QUERY
        SELECT 
            mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
            ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
            ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
            ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
            ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
            ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
            COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
            COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
            CASE 
                WHEN mt.total_ticks > 0 
                THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                ELSE 0
            END AS success_rate
        FROM monitor_tick_2hour mt
        WHERE mt."monitorId" = p_monitor_id::text
          AND mt.time_bucket >= p_start
          AND mt.time_bucket <= p_end
        ORDER BY mt.time_bucket ASC;
    END IF;
END;
$$ LANGUAGE plpgsql;


-- Function to get monitor regional timeseries for a custom time range using continuous aggregates
CREATE OR REPLACE FUNCTION get_monitor_regional_timeseries_range(
    p_monitor_id UUID,
    p_region_type TEXT, -- 'country' | 'continent'
    p_region_code TEXT,
    p_start TIMESTAMPTZ,
    p_end TIMESTAMPTZ
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
DECLARE
    v_duration INTERVAL := p_end - p_start;
BEGIN
    IF p_region_type NOT IN ('country', 'continent') THEN
        RAISE EXCEPTION 'Invalid region_type. Use: country or continent';
    END IF;

    IF v_duration <= INTERVAL '25 hours' THEN
        IF p_region_type = 'country' THEN
            RETURN QUERY
            SELECT 
                mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN mt.total_ticks > 0 
                    THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_country_5min mt
            WHERE mt."monitorId" = p_monitor_id::text
              AND mt."countryCode" = p_region_code
              AND mt.time_bucket >= p_start AND mt.time_bucket <= p_end
            ORDER BY mt.time_bucket ASC;
        ELSE
            RETURN QUERY
            SELECT 
                mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN mt.total_ticks > 0 
                    THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_continent_5min mt
            WHERE mt."monitorId" = p_monitor_id::text
              AND mt."continentCode" = p_region_code
              AND mt.time_bucket >= p_start AND mt.time_bucket <= p_end
            ORDER BY mt.time_bucket ASC;
        END IF;
    ELSIF v_duration <= INTERVAL '8 days' THEN
        IF p_region_type = 'country' THEN
            RETURN QUERY
            SELECT 
                mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN mt.total_ticks > 0 
                    THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_country_30min mt
            WHERE mt."monitorId" = p_monitor_id::text
              AND mt."countryCode" = p_region_code
              AND mt.time_bucket >= p_start AND mt.time_bucket <= p_end
            ORDER BY mt.time_bucket ASC;
        ELSE
            RETURN QUERY
            SELECT 
                mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN mt.total_ticks > 0 
                    THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_continent_30min mt
            WHERE mt."monitorId" = p_monitor_id::text
              AND mt."continentCode" = p_region_code
              AND mt.time_bucket >= p_start AND mt.time_bucket <= p_end
            ORDER BY mt.time_bucket ASC;
        END IF;
    ELSE
        IF p_region_type = 'country' THEN
            RETURN QUERY
            SELECT 
                mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN mt.total_ticks > 0 
                    THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_country_2hour mt
            WHERE mt."monitorId" = p_monitor_id::text
              AND mt."countryCode" = p_region_code
              AND mt.time_bucket >= p_start AND mt.time_bucket <= p_end
            ORDER BY mt.time_bucket ASC;
        ELSE
            RETURN QUERY
            SELECT 
                mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                CASE 
                    WHEN mt.total_ticks > 0 
                    THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM monitor_tick_continent_2hour mt
            WHERE mt."monitorId" = p_monitor_id::text
              AND mt."continentCode" = p_region_code
              AND mt.time_bucket >= p_start AND mt.time_bucket <= p_end
            ORDER BY mt.time_bucket ASC;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get monitor regional timeseries (country or continent)
CREATE OR REPLACE FUNCTION get_monitor_regional_timeseries(
    p_monitor_id UUID,
    p_region_type TEXT,
    p_region_code TEXT,
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
    IF p_region_type NOT IN ('country', 'continent') THEN
        RAISE EXCEPTION 'Invalid region_type. Use: country or continent';
    END IF;

    CASE p_period
        WHEN 'day' THEN
            IF p_region_type = 'country' THEN
                RETURN QUERY
                SELECT 
                    mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                    ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                    ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                    ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                    ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                    ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                    COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                    COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                    CASE 
                        WHEN mt.total_ticks > 0 
                        THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS success_rate
                FROM monitor_tick_country_5min mt
                WHERE mt."monitorId" = p_monitor_id::text
                    AND mt."countryCode" = p_region_code
                    AND mt.time_bucket >= NOW() - INTERVAL '24 hours'
                    AND mt.time_bucket <= NOW()
                ORDER BY mt.time_bucket ASC;
            ELSE
                RETURN QUERY
                SELECT 
                    mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                    ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                    ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                    ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                    ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                    ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                    COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                    COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                    CASE 
                        WHEN mt.total_ticks > 0 
                        THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS success_rate
                FROM monitor_tick_continent_5min mt
                WHERE mt."monitorId" = p_monitor_id::text
                    AND mt."continentCode" = p_region_code
                    AND mt.time_bucket >= NOW() - INTERVAL '24 hours'
                    AND mt.time_bucket <= NOW()
                ORDER BY mt.time_bucket ASC;
            END IF;

        WHEN 'week' THEN
            IF p_region_type = 'country' THEN
                RETURN QUERY
                SELECT 
                    mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                    ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                    ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                    ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                    ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                    ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                    COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                    COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                    CASE 
                        WHEN mt.total_ticks > 0 
                        THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS success_rate
                FROM monitor_tick_country_30min mt
                WHERE mt."monitorId" = p_monitor_id::text
                    AND mt."countryCode" = p_region_code
                    AND mt.time_bucket >= NOW() - INTERVAL '7 days'
                    AND mt.time_bucket <= NOW()
                ORDER BY mt.time_bucket ASC;
            ELSE
                RETURN QUERY
                SELECT 
                    mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                    ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                    ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                    ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                    ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                    ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                    COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                    COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                    CASE 
                        WHEN mt.total_ticks > 0 
                        THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS success_rate
                FROM monitor_tick_continent_30min mt
                WHERE mt."monitorId" = p_monitor_id::text
                    AND mt."continentCode" = p_region_code
                    AND mt.time_bucket >= NOW() - INTERVAL '7 days'
                    AND mt.time_bucket <= NOW()
                ORDER BY mt.time_bucket ASC;
            END IF;

        WHEN 'month' THEN
            IF p_region_type = 'country' THEN
                RETURN QUERY
                SELECT 
                    mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                    ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                    ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                    ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                    ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                    ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                    COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                    COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                    CASE 
                        WHEN mt.total_ticks > 0 
                        THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS success_rate
                FROM monitor_tick_country_2hour mt
                WHERE mt."monitorId" = p_monitor_id::text
                    AND mt."countryCode" = p_region_code
                    AND mt.time_bucket >= NOW() - INTERVAL '30 days'
                    AND mt.time_bucket <= NOW()
                ORDER BY mt.time_bucket ASC;
            ELSE
                RETURN QUERY
                SELECT 
                    mt.time_bucket::TIMESTAMPTZ AS timestamp_bucket,
                    ROUND(mt.avg_latency::NUMERIC, 2) AS avg_latency,
                    ROUND(mt.min_latency::NUMERIC, 2) AS min_latency,
                    ROUND(mt.max_latency::NUMERIC, 2) AS max_latency,
                    ROUND(mt.median_latency::NUMERIC, 2) AS median_latency,
                    ROUND(mt.p95_latency::NUMERIC, 2) AS p95_latency,
                    COALESCE(mt.total_ticks, 0)::BIGINT AS total_ticks,
                    COALESCE(mt.successful_ticks, 0)::BIGINT AS successful_ticks,
                    CASE 
                        WHEN mt.total_ticks > 0 
                        THEN ROUND((mt.successful_ticks::NUMERIC / mt.total_ticks::NUMERIC) * 100, 2)
                        ELSE 0
                    END AS success_rate
                FROM monitor_tick_continent_2hour mt
                WHERE mt."monitorId" = p_monitor_id::text
                    AND mt."continentCode" = p_region_code
                    AND mt.time_bucket >= NOW() - INTERVAL '30 days'
                    AND mt.time_bucket <= NOW()
                ORDER BY mt.time_bucket ASC;
            END IF;
        ELSE
            RAISE EXCEPTION 'Invalid period. Use: day, week, or month';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get monitor hourly patterns 
CREATE OR REPLACE FUNCTION get_monitor_hourly_patterns(
    p_monitor_id UUID,
    p_period TEXT DEFAULT 'week'
) RETURNS TABLE (
    hour_of_day INTEGER,
    avg_latency NUMERIC,
    total_checks BIGINT,
    successful_checks BIGINT,
    success_rate NUMERIC,
    check_frequency NUMERIC
) AS $$
BEGIN
    CASE p_period
        WHEN 'day' THEN
            RETURN QUERY
            SELECT 
                EXTRACT(HOUR FROM mt.time_bucket)::INTEGER AS hour_of_day,
                ROUND(AVG(mt.avg_latency)::NUMERIC, 2) AS avg_latency,
                SUM(mt.total_ticks)::BIGINT AS total_checks,
                SUM(mt.successful_ticks)::BIGINT AS successful_checks,
                CASE 
                    WHEN SUM(mt.total_ticks) > 0 
                    THEN ROUND((SUM(mt.successful_ticks)::NUMERIC / SUM(mt.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate,
                ROUND((SUM(mt.total_ticks)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)), 2) AS check_frequency
            FROM monitor_tick_5min mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt.time_bucket >= NOW() - INTERVAL '24 hours'
            GROUP BY EXTRACT(HOUR FROM mt.time_bucket)
            ORDER BY hour_of_day;
            
        WHEN 'week' THEN
            RETURN QUERY
            SELECT 
                EXTRACT(HOUR FROM mt.time_bucket)::INTEGER AS hour_of_day,
                ROUND(AVG(mt.avg_latency)::NUMERIC, 2) AS avg_latency,
                SUM(mt.total_ticks)::BIGINT AS total_checks,
                SUM(mt.successful_ticks)::BIGINT AS successful_checks,
                CASE 
                    WHEN SUM(mt.total_ticks) > 0 
                    THEN ROUND((SUM(mt.successful_ticks)::NUMERIC / SUM(mt.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate,
                ROUND((SUM(mt.total_ticks)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)), 2) AS check_frequency
            FROM monitor_tick_30min mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt.time_bucket >= NOW() - INTERVAL '7 days'
            GROUP BY EXTRACT(HOUR FROM mt.time_bucket)
            ORDER BY hour_of_day;
            
        WHEN 'month' THEN
            RETURN QUERY
            SELECT 
                EXTRACT(HOUR FROM mt.time_bucket)::INTEGER AS hour_of_day,
                ROUND(AVG(mt.avg_latency)::NUMERIC, 2) AS avg_latency,
                SUM(mt.total_ticks)::BIGINT AS total_checks,
                SUM(mt.successful_ticks)::BIGINT AS successful_checks,
                CASE 
                    WHEN SUM(mt.total_ticks) > 0 
                    THEN ROUND((SUM(mt.successful_ticks)::NUMERIC / SUM(mt.total_ticks)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate,
                ROUND((SUM(mt.total_ticks)::NUMERIC / NULLIF(COUNT(*)::NUMERIC, 0)), 2) AS check_frequency
            FROM monitor_tick_2hour mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt.time_bucket >= NOW() - INTERVAL '30 days'
            GROUP BY EXTRACT(HOUR FROM mt.time_bucket)
            ORDER BY hour_of_day;
        ELSE
            RAISE EXCEPTION 'Invalid period. Use: day, week, or month';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get monitor weekly comparison
CREATE OR REPLACE FUNCTION get_monitor_weekly_comparison(
    p_monitor_id UUID
) RETURNS TABLE (
    metric_name TEXT,
    current_week NUMERIC,
    previous_week NUMERIC,
    change_percentage NUMERIC,
    trend_direction TEXT
) AS $$
BEGIN
    RETURN QUERY
    WITH current_week_data AS (
        SELECT 
            COALESCE(SUM(mt.total_ticks), 0) as total_checks,
            COALESCE(SUM(mt.successful_ticks), 0) as successful_checks,
            ROUND(AVG(mt.avg_latency)::NUMERIC, 2) as avg_latency,
            CASE 
                WHEN SUM(mt.total_ticks) > 0 
                THEN ROUND((SUM(mt.successful_ticks)::NUMERIC / SUM(mt.total_ticks)::NUMERIC) * 100, 2)
                ELSE 0
            END as uptime_percentage
        FROM monitor_tick_30min mt
        WHERE mt."monitorId" = p_monitor_id::text
            AND mt.time_bucket >= NOW() - INTERVAL '7 days'
    ),
    previous_week_data AS (
        SELECT 
            COALESCE(SUM(mt.total_ticks), 0) as total_checks,
            COALESCE(SUM(mt.successful_ticks), 0) as successful_checks,
            ROUND(AVG(mt.avg_latency)::NUMERIC, 2) as avg_latency,
            CASE 
                WHEN SUM(mt.total_ticks) > 0 
                THEN ROUND((SUM(mt.successful_ticks)::NUMERIC / SUM(mt.total_ticks)::NUMERIC) * 100, 2)
                ELSE 0
            END as uptime_percentage
        FROM monitor_tick_30min mt
        WHERE mt."monitorId" = p_monitor_id::text
            AND mt.time_bucket >= NOW() - INTERVAL '14 days'
            AND mt.time_bucket < NOW() - INTERVAL '7 days'
    )
    SELECT 'Uptime'::TEXT as metric_name,
           c.uptime_percentage as current_week,
           p.uptime_percentage as previous_week,
           CASE 
               WHEN p.uptime_percentage > 0 
               THEN ROUND(((c.uptime_percentage - p.uptime_percentage) / p.uptime_percentage) * 100, 2)
               ELSE 0
           END as change_percentage,
           CASE 
               WHEN c.uptime_percentage > p.uptime_percentage THEN 'up'::TEXT
               WHEN c.uptime_percentage < p.uptime_percentage THEN 'down'::TEXT
               ELSE 'stable'::TEXT
           END as trend_direction
    FROM current_week_data c, previous_week_data p
    
    UNION ALL
    
    SELECT 'Average Latency'::TEXT as metric_name,
           c.avg_latency as current_week,
           p.avg_latency as previous_week,
           CASE 
               WHEN p.avg_latency > 0 
               THEN ROUND(((c.avg_latency - p.avg_latency) / p.avg_latency) * 100, 2)
               ELSE 0
           END as change_percentage,
           CASE 
               WHEN c.avg_latency < p.avg_latency THEN 'up'::TEXT
               WHEN c.avg_latency > p.avg_latency THEN 'down'::TEXT
               ELSE 'stable'::TEXT
           END as trend_direction
    FROM current_week_data c, previous_week_data p
    
    UNION ALL
    
    SELECT 'Total Checks'::TEXT as metric_name,
           c.total_checks::NUMERIC as current_week,
           p.total_checks::NUMERIC as previous_week,
           CASE 
               WHEN p.total_checks > 0 
               THEN ROUND(((c.total_checks - p.total_checks)::NUMERIC / p.total_checks::NUMERIC) * 100, 2)
               ELSE 0
           END as change_percentage,
           CASE 
               WHEN c.total_checks > p.total_checks THEN 'up'::TEXT
               WHEN c.total_checks < p.total_checks THEN 'down'::TEXT
               ELSE 'stable'::TEXT
           END as trend_direction
    FROM current_week_data c, previous_week_data p;
END;
$$ LANGUAGE plpgsql;

-- Function to get monitor performance insights and recommendations
CREATE OR REPLACE FUNCTION get_monitor_performance_insights(
    p_monitor_id UUID,
    p_period TEXT DEFAULT 'week'
) RETURNS TABLE (
    insight_type TEXT,
    insight_title TEXT,
    insight_message TEXT,
    severity TEXT,
    recommendation TEXT,
    health_score TEXT
) AS $$
DECLARE
    v_uptime_percentage NUMERIC;
    v_avg_latency NUMERIC;
    v_worst_hour INTEGER;
    v_best_hour INTEGER;
    v_health_grade TEXT;
BEGIN
    -- Get basic stats based on period
    CASE p_period
        WHEN 'day' THEN
            SELECT 
                CASE WHEN SUM(mt.total_ticks) > 0 THEN 
                    ROUND((SUM(mt.successful_ticks)::NUMERIC / SUM(mt.total_ticks)::NUMERIC) * 100, 2)
                ELSE 0 END,
                ROUND(AVG(mt.avg_latency)::NUMERIC, 2)
            INTO v_uptime_percentage, v_avg_latency
            FROM monitor_tick_5min mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt.time_bucket >= NOW() - INTERVAL '24 hours';
                
        WHEN 'week' THEN
            SELECT 
                CASE WHEN SUM(mt.total_ticks) > 0 THEN 
                    ROUND((SUM(mt.successful_ticks)::NUMERIC / SUM(mt.total_ticks)::NUMERIC) * 100, 2)
                ELSE 0 END,
                ROUND(AVG(mt.avg_latency)::NUMERIC, 2)
            INTO v_uptime_percentage, v_avg_latency
            FROM monitor_tick_30min mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt.time_bucket >= NOW() - INTERVAL '7 days';
                
        ELSE
            SELECT 
                CASE WHEN SUM(mt.total_ticks) > 0 THEN 
                    ROUND((SUM(mt.successful_ticks)::NUMERIC / SUM(mt.total_ticks)::NUMERIC) * 100, 2)
                ELSE 0 END,
                ROUND(AVG(mt.avg_latency)::NUMERIC, 2)
            INTO v_uptime_percentage, v_avg_latency
            FROM monitor_tick_2hour mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt.time_bucket >= NOW() - INTERVAL '30 days';
    END CASE;
    
    -- Calculate health grade
    v_health_grade := CASE 
        WHEN v_uptime_percentage >= 99.9 AND v_avg_latency <= 200 THEN 'A+'
        WHEN v_uptime_percentage >= 99.5 AND v_avg_latency <= 500 THEN 'A'
        WHEN v_uptime_percentage >= 99.0 AND v_avg_latency <= 1000 THEN 'B'
        WHEN v_uptime_percentage >= 98.0 AND v_avg_latency <= 2000 THEN 'C'
        WHEN v_uptime_percentage >= 95.0 AND v_avg_latency <= 5000 THEN 'D'
        ELSE 'F'
    END;
    
    -- Find worst and best performing hours
    SELECT hour_of_day INTO v_worst_hour
    FROM get_monitor_hourly_patterns(p_monitor_id, p_period)
    WHERE success_rate > 0
    ORDER BY success_rate ASC, avg_latency DESC
    LIMIT 1;
    
    SELECT hour_of_day INTO v_best_hour  
    FROM get_monitor_hourly_patterns(p_monitor_id, p_period)
    WHERE success_rate > 0
    ORDER BY success_rate DESC, avg_latency ASC
    LIMIT 1;
    
    -- Health Score Insight
    RETURN QUERY SELECT
        'health_score'::TEXT,
        'Overall Health Grade'::TEXT,
        format('Your monitor has a health grade of %s based on uptime (%s%%) and latency (%s ms)',
               v_health_grade, COALESCE(v_uptime_percentage, 0), COALESCE(v_avg_latency, 0))::TEXT,
        CASE 
            WHEN v_health_grade IN ('A+', 'A') THEN 'success'::TEXT
            WHEN v_health_grade IN ('B', 'C') THEN 'warning'::TEXT
            ELSE 'error'::TEXT
        END,
        CASE 
            WHEN v_health_grade IN ('A+', 'A') THEN 'Excellent performance! Continue monitoring.'::TEXT
            WHEN v_health_grade IN ('B', 'C') THEN 'Consider optimizing response times or reducing downtime.'::TEXT
            ELSE 'Immediate attention needed - check server configuration and network connectivity.'::TEXT
        END,
        v_health_grade::TEXT;
    
    -- Uptime Insights
    IF v_uptime_percentage IS NOT NULL THEN
        RETURN QUERY SELECT
            'uptime'::TEXT,
            'Uptime Performance'::TEXT,
            CASE 
                WHEN v_uptime_percentage >= 99.9 THEN format('Excellent uptime of %s%% - meeting enterprise SLA standards.', v_uptime_percentage)
                WHEN v_uptime_percentage >= 99.0 THEN format('Good uptime of %s%% - minor improvements possible.', v_uptime_percentage)
                WHEN v_uptime_percentage >= 95.0 THEN format('Moderate uptime of %s%% - needs attention.', v_uptime_percentage)
                ELSE format('Poor uptime of %s%% - critical issues detected.', v_uptime_percentage)
            END::TEXT,
            CASE 
                WHEN v_uptime_percentage >= 99.5 THEN 'success'::TEXT
                WHEN v_uptime_percentage >= 99.0 THEN 'warning'::TEXT
                ELSE 'error'::TEXT
            END,
            CASE 
                WHEN v_uptime_percentage >= 99.9 THEN 'Monitor is highly reliable. Consider setting up proactive alerting.'::TEXT
                WHEN v_uptime_percentage >= 99.0 THEN 'Review recent incidents and consider redundancy measures.'::TEXT
                ELSE 'Investigate recurring downtime patterns and server health immediately.'::TEXT
            END,
            v_health_grade::TEXT;
    END IF;
    
    -- Latency Insights
    IF v_avg_latency IS NOT NULL THEN
        RETURN QUERY SELECT
            'latency'::TEXT,
            'Response Time Analysis'::TEXT,
            CASE 
                WHEN v_avg_latency <= 200 THEN format('Excellent response time of %s ms - users will experience fast loading.', v_avg_latency)
                WHEN v_avg_latency <= 1000 THEN format('Good response time of %s ms - acceptable for most users.', v_avg_latency)
                WHEN v_avg_latency <= 3000 THEN format('Slow response time of %s ms - may impact user experience.', v_avg_latency)
                ELSE format('Very slow response time of %s ms - optimization required.', v_avg_latency)
            END::TEXT,
            CASE 
                WHEN v_avg_latency <= 500 THEN 'success'::TEXT
                WHEN v_avg_latency <= 2000 THEN 'warning'::TEXT
                ELSE 'error'::TEXT
            END,
            CASE 
                WHEN v_avg_latency <= 200 THEN 'Performance is optimal. Monitor for any degradation trends.'::TEXT
                WHEN v_avg_latency <= 1000 THEN 'Consider CDN implementation or server optimization.'::TEXT
                ELSE 'Investigate server performance, database queries, and network latency.'::TEXT
            END,
            v_health_grade::TEXT;
    END IF;
    
    -- Hourly Pattern Insights
    IF v_worst_hour IS NOT NULL AND v_best_hour IS NOT NULL THEN
        RETURN QUERY SELECT
            'patterns'::TEXT,
            'Traffic Pattern Analysis'::TEXT,
            format('Performance varies by time of day. Best performance at %s:00, worst at %s:00.',
                   v_best_hour, v_worst_hour)::TEXT,
            'info'::TEXT,
            format('Consider scaling resources during peak hours (%s:00) or investigate load balancing.',
                   v_worst_hour)::TEXT,
            v_health_grade::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;