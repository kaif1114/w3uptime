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
                mt."countryCode"::TEXT AS country_code,
                ROUND(AVG(mt.latency)::NUMERIC, 2) AS avg_latency,
                COUNT(*)::BIGINT AS total_ticks,
                COUNT(*) FILTER (WHERE mt.status = 'GOOD')::BIGINT AS successful_ticks,
                CASE 
                    WHEN COUNT(*) > 0 
                    THEN ROUND((COUNT(*) FILTER (WHERE mt.status = 'GOOD')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM "MonitorTick" mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt."createdAt" >= NOW() - INTERVAL '24 hours'
                AND mt."countryCode" IS NOT NULL
            GROUP BY mt."countryCode";
            
        WHEN 'week' THEN
            RETURN QUERY
            SELECT 
                mt."countryCode"::TEXT AS country_code,
                ROUND(AVG(mt.latency)::NUMERIC, 2) AS avg_latency,
                COUNT(*)::BIGINT AS total_ticks,
                COUNT(*) FILTER (WHERE mt.status = 'GOOD')::BIGINT AS successful_ticks,
                CASE 
                    WHEN COUNT(*) > 0 
                    THEN ROUND((COUNT(*) FILTER (WHERE mt.status = 'GOOD')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM "MonitorTick" mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt."createdAt" >= NOW() - INTERVAL '7 days'
                AND mt."countryCode" IS NOT NULL
            GROUP BY mt."countryCode";
            
        WHEN 'month' THEN
            RETURN QUERY
            SELECT 
                mt."countryCode"::TEXT AS country_code,
                ROUND(AVG(mt.latency)::NUMERIC, 2) AS avg_latency,
                COUNT(*)::BIGINT AS total_ticks,
                COUNT(*) FILTER (WHERE mt.status = 'GOOD')::BIGINT AS successful_ticks,
                CASE 
                    WHEN COUNT(*) > 0 
                    THEN ROUND((COUNT(*) FILTER (WHERE mt.status = 'GOOD')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM "MonitorTick" mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt."createdAt" >= NOW() - INTERVAL '30 days'
                AND mt."countryCode" IS NOT NULL
            GROUP BY mt."countryCode";
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
                mt."continentCode"::TEXT AS continent_code,
                ROUND(AVG(mt.latency)::NUMERIC, 2) AS avg_latency,
                COUNT(*)::BIGINT AS total_ticks,
                COUNT(*) FILTER (WHERE mt.status = 'GOOD')::BIGINT AS successful_ticks,
                CASE 
                    WHEN COUNT(*) > 0 
                    THEN ROUND((COUNT(*) FILTER (WHERE mt.status = 'GOOD')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM "MonitorTick" mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt."createdAt" >= NOW() - INTERVAL '24 hours'
                AND mt."continentCode" IS NOT NULL
            GROUP BY mt."continentCode";
            
        WHEN 'week' THEN
            RETURN QUERY
            SELECT 
                mt."continentCode"::TEXT AS continent_code,
                ROUND(AVG(mt.latency)::NUMERIC, 2) AS avg_latency,
                COUNT(*)::BIGINT AS total_ticks,
                COUNT(*) FILTER (WHERE mt.status = 'GOOD')::BIGINT AS successful_ticks,
                CASE 
                    WHEN COUNT(*) > 0 
                    THEN ROUND((COUNT(*) FILTER (WHERE mt.status = 'GOOD')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM "MonitorTick" mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt."createdAt" >= NOW() - INTERVAL '7 days'
                AND mt."continentCode" IS NOT NULL
            GROUP BY mt."continentCode";
            
        WHEN 'month' THEN
            RETURN QUERY
            SELECT 
                mt."continentCode"::TEXT AS continent_code,
                ROUND(AVG(mt.latency)::NUMERIC, 2) AS avg_latency,
                COUNT(*)::BIGINT AS total_ticks,
                COUNT(*) FILTER (WHERE mt.status = 'GOOD')::BIGINT AS successful_ticks,
                CASE 
                    WHEN COUNT(*) > 0 
                    THEN ROUND((COUNT(*) FILTER (WHERE mt.status = 'GOOD')::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
                    ELSE 0
                END AS success_rate
            FROM "MonitorTick" mt
            WHERE mt."monitorId" = p_monitor_id::text
                AND mt."createdAt" >= NOW() - INTERVAL '30 days'
                AND mt."continentCode" IS NOT NULL
            GROUP BY mt."continentCode";
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
