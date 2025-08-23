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

-- 5. Create functions to query monitor timeseries data

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
        WHEN 'hour' THEN
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
            WHERE monitor_tick_5min."monitorId" = p_monitor_id
                AND monitor_tick_5min.time_bucket >= NOW() - INTERVAL '1 hour'
                AND monitor_tick_5min.time_bucket <= NOW()
            ORDER BY monitor_tick_5min.time_bucket ASC;
            
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
            WHERE monitor_tick_5min."monitorId" = p_monitor_id
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
            WHERE monitor_tick_30min."monitorId" = p_monitor_id
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
            WHERE monitor_tick_2hour."monitorId" = p_monitor_id
                AND monitor_tick_2hour.time_bucket >= NOW() - INTERVAL '30 days'
                AND monitor_tick_2hour.time_bucket <= NOW()
            ORDER BY monitor_tick_2hour.time_bucket ASC;
        ELSE
            RAISE EXCEPTION 'Invalid period. Use: hour, day, week, or month';
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
        WHEN 'hour' THEN
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
            WHERE monitor_tick_5min."monitorId" = p_monitor_id
                AND monitor_tick_5min.time_bucket >= NOW() - INTERVAL '1 hour';
                
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
            WHERE monitor_tick_5min."monitorId" = p_monitor_id
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
            WHERE monitor_tick_30min."monitorId" = p_monitor_id
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
            WHERE monitor_tick_2hour."monitorId" = p_monitor_id
                AND monitor_tick_2hour.time_bucket >= NOW() - INTERVAL '30 days';
        ELSE
            RAISE EXCEPTION 'Invalid period. Use: hour, day, week, or month';
    END CASE;
END;
$$ LANGUAGE plpgsql;


-- LET THESE DEBUG QUERIES BE THERE AT THE END OF FILE COMMENTED OUT

-- SELECT * FROM get_total_avg_latency('01a06e1f-df5b-41c8-a827-f2780df04e89', 'hour')
-- SELECT * FROM get_monitor_timeseries('01a06e1f-df5b-41c8-a827-f2780df04e89', 'hour')
-- CALL refresh_continuous_aggregate('monitor_tick_5min', NULL, NULL);
-- SELECT * FROM pg_stat_activity WHERE application_name LIKE '%timescale%';
-- SELECT _timescaledb_functions.restart_background_workers();
-- SELECT * FROM pg_extension WHERE extname = 'timescaledb';
-- SELECT * FROM timescaledb_information.jobs;
-- SHOW timescaledb.max_background_workers;
-- SHOW max_worker_processes;
-- SHOW shared_preload_libraries;
-- SELECT * FROM pg_stat_activity WHERE backend_type = 'background worker';
-- CALL run_job(1003);
-- CALL run_job(1004);
-- CALL run_job(1005); 
-- CALL run_job(1006);  



-- SELECT COUNT(*), MIN("createdAt"), MAX("createdAt") 
-- FROM "MonitorTick" 
-- WHERE "monitorId" = '01a06e1f-df5b-41c8-a827-f2780df04e89' 
-- AND "createdAt" >= '2025-08-22 20:00:00+00';

-- SELECT COUNT(*), MIN("createdAt"), MAX("createdAt") 
-- FROM "MonitorTick" 
-- WHERE "monitorId" = '01a06e1f-df5b-41c8-a827-f2780df04e89' 
-- AND "createdAt" >= NOW() - INTERVAL '1 hour';

-- CALL refresh_continuous_aggregate('monitor_tick_5min', 
--     '2025-08-22 19:00:00+00', 
--     '2025-08-22 20:00:00+00'
-- );


-- For changing the timezone
-- ALTER SYSTEM SET timezone = 'Asia/Karachi';
-- SELECT pg_reload_conf();