-- 1. First, ensure TimescaleDB extension is enabled
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 2. Convert MonitorTick table to hypertable
-- This should be run AFTER your Prisma migration creates the table
-- Note: The table now uses a composite primary key (id, createdAt) to support hypertable partitioning
SELECT create_hypertable('"MonitorTick"', 'createdAt', 
  chunk_time_interval => INTERVAL '1 day',
  if_not_exists => TRUE
);

-- 3. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_monitor_tick_monitor_id_time 
ON "MonitorTick" ("monitorId", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_monitor_tick_country_time 
ON "MonitorTick" ("countryCode", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_monitor_tick_continent_time 
ON "MonitorTick" ("continentCode", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_monitor_tick_city_time 
ON "MonitorTick" ("city", "createdAt" DESC);

CREATE INDEX IF NOT EXISTS idx_monitor_tick_status_time 
ON "MonitorTick" ("status", "createdAt" DESC);

-- 4. Create a continuous aggregate for hourly data (optional but recommended for performance)
CREATE MATERIALIZED VIEW monitor_tick_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', "createdAt") AS hour,
    "monitorId",
    "countryCode",
    "continentCode",
    "city",
    "status",
    AVG("latency") AS avg_latency,
    MIN("latency") AS min_latency,
    MAX("latency") AS max_latency,
    COUNT(*) AS tick_count,
    COUNT(CASE WHEN "status" = 'GOOD' THEN 1 END) AS up_count,
    COUNT(CASE WHEN "status" = 'BAD' THEN 1 END) AS down_count
FROM "MonitorTick"
GROUP BY hour, "monitorId", "countryCode", "continentCode", "city", "status";

-- Enable automatic refresh of the continuous aggregate
SELECT add_continuous_aggregate_policy('monitor_tick_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- =============================================================================
-- QUERY FUNCTIONS FOR INSIGHTS
-- =============================================================================

-- Function to get time range based on period
CREATE OR REPLACE FUNCTION get_time_range(period_type TEXT)
RETURNS INTERVAL AS $$
BEGIN
    CASE period_type
        WHEN '1hr' THEN RETURN INTERVAL '1 hour';
        WHEN '1day' THEN RETURN INTERVAL '1 day';
        WHEN '3days' THEN RETURN INTERVAL '3 days';
        WHEN '1week' THEN RETURN INTERVAL '1 week';
        WHEN '2weeks' THEN RETURN INTERVAL '2 weeks';
        WHEN '30days' THEN RETURN INTERVAL '30 days';
        WHEN '90days' THEN RETURN INTERVAL '90 days';
        ELSE RETURN INTERVAL '30 days';
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 1. AVERAGE LATENCY BY COUNTRY
-- =============================================================================
-- Usage: SELECT * FROM get_avg_latency_by_country('monitor-uuid', '1week');
CREATE OR REPLACE FUNCTION get_avg_latency_by_country(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT '30days'
)
RETURNS TABLE(
    country_code TEXT,
    avg_latency NUMERIC,
    sample_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt."countryCode"::TEXT,
        ROUND(AVG(mt."latency")::NUMERIC, 2) AS avg_latency,
        COUNT(*) AS sample_count
    FROM "MonitorTick" mt
    WHERE mt."monitorId" = monitor_id_param
        AND mt."createdAt" >= NOW() - get_time_range(period_param)
    GROUP BY mt."countryCode"
    ORDER BY avg_latency ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. AVERAGE LATENCY BY CONTINENT
-- =============================================================================
CREATE OR REPLACE FUNCTION get_avg_latency_by_continent(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT '30days'
)
RETURNS TABLE(
    continent_code TEXT,
    avg_latency NUMERIC,
    sample_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt."continentCode"::TEXT,
        ROUND(AVG(mt."latency")::NUMERIC, 2) AS avg_latency,
        COUNT(*) AS sample_count
    FROM "MonitorTick" mt
    WHERE mt."monitorId" = monitor_id_param
        AND mt."createdAt" >= NOW() - get_time_range(period_param)
    GROUP BY mt."continentCode"
    ORDER BY avg_latency ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. AVERAGE LATENCY BY CITY
-- =============================================================================
CREATE OR REPLACE FUNCTION get_avg_latency_by_city(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT '30days'
)
RETURNS TABLE(
    city TEXT,
    country_code TEXT,
    avg_latency NUMERIC,
    sample_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        mt."city"::TEXT,
        mt."countryCode"::TEXT,
        ROUND(AVG(mt."latency")::NUMERIC, 2) AS avg_latency,
        COUNT(*) AS sample_count
    FROM "MonitorTick" mt
    WHERE mt."monitorId" = monitor_id_param
        AND mt."createdAt" >= NOW() - get_time_range(period_param)
    GROUP BY mt."city", mt."countryCode"
    ORDER BY avg_latency ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. BEST PERFORMING REGION (LOWEST LATENCY)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_best_performing_region(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT '30days'
)
RETURNS TABLE(
    region_type TEXT,
    region_name TEXT,
    avg_latency NUMERIC,
    sample_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH regional_performance AS (
        SELECT 'Country' as region_type, "countryCode" as region_name, 
               AVG("latency") as avg_latency, COUNT(*) as sample_count
        FROM "MonitorTick"
        WHERE "monitorId" = monitor_id_param
            AND "createdAt" >= NOW() - get_time_range(period_param)
        GROUP BY "countryCode"
        
        UNION ALL
        
        SELECT 'Continent' as region_type, "continentCode" as region_name,
               AVG("latency") as avg_latency, COUNT(*) as sample_count
        FROM "MonitorTick"
        WHERE "monitorId" = monitor_id_param
            AND "createdAt" >= NOW() - get_time_range(period_param)
        GROUP BY "continentCode"
        
        UNION ALL
        
        SELECT 'City' as region_type, "city" as region_name,
               AVG("latency") as avg_latency, COUNT(*) as sample_count
        FROM "MonitorTick"
        WHERE "monitorId" = monitor_id_param
            AND "createdAt" >= NOW() - get_time_range(period_param)
        GROUP BY "city"
    )
    SELECT rp.region_type::TEXT, rp.region_name::TEXT, 
           ROUND(rp.avg_latency::NUMERIC, 2), rp.sample_count
    FROM regional_performance rp
    ORDER BY rp.avg_latency ASC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. TOTAL AVERAGE LATENCY
-- =============================================================================
CREATE OR REPLACE FUNCTION get_total_avg_latency(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT '30days'
)
RETURNS TABLE(
    avg_latency NUMERIC,
    min_latency NUMERIC,
    max_latency NUMERIC,
    sample_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ROUND(AVG(mt."latency")::NUMERIC, 2) AS avg_latency,
        ROUND(MIN(mt."latency")::NUMERIC, 2) AS min_latency,
        ROUND(MAX(mt."latency")::NUMERIC, 2) AS max_latency,
        COUNT(*) AS sample_count
    FROM "MonitorTick" mt
    WHERE mt."monitorId" = monitor_id_param
        AND mt."createdAt" >= NOW() - get_time_range(period_param);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. UPTIME DATA
-- =============================================================================
CREATE OR REPLACE FUNCTION get_uptime_data(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT '30days'
)
RETURNS TABLE(
    total_checks BIGINT,
    successful_checks BIGINT,
    failed_checks BIGINT,
    uptime_percentage NUMERIC,
    availability_sla NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) AS total_checks,
        COUNT(CASE WHEN mt."status" = 'GOOD' THEN 1 END) AS successful_checks,
        COUNT(CASE WHEN mt."status" = 'BAD' THEN 1 END) AS failed_checks,
        ROUND((COUNT(CASE WHEN mt."status" = 'GOOD' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 4) AS uptime_percentage,
        ROUND((COUNT(CASE WHEN mt."status" = 'GOOD' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) AS availability_sla
    FROM "MonitorTick" mt
    WHERE mt."monitorId" = monitor_id_param
        AND mt."createdAt" >= NOW() - get_time_range(period_param);
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. DOWNTIME DATA WITH INCIDENT PERIODS
-- =============================================================================
CREATE OR REPLACE FUNCTION get_downtime_data(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT '30days'
)
RETURNS TABLE(
    total_downtime_duration INTERVAL,
    downtime_incidents BIGINT,
    avg_incident_duration INTERVAL,
    longest_incident INTERVAL,
    mttr INTERVAL -- Mean Time To Recovery
) AS $$
BEGIN
    RETURN QUERY
    WITH downtime_periods AS (
        SELECT 
            mt."createdAt" as start_time,
            LEAD(mt."createdAt") OVER (ORDER BY mt."createdAt") as end_time,
            mt."status"
        FROM "MonitorTick" mt
        WHERE mt."monitorId" = monitor_id_param
            AND mt."createdAt" >= NOW() - get_time_range(period_param)
        ORDER BY mt."createdAt"
    ),
    incidents AS (
        SELECT 
            (end_time - start_time) as duration
        FROM downtime_periods
        WHERE "status" = 'BAD' AND end_time IS NOT NULL
    )
    SELECT 
        COALESCE(SUM(duration), INTERVAL '0') as total_downtime_duration,
        COUNT(*) as downtime_incidents,
        COALESCE(AVG(duration), INTERVAL '0') as avg_incident_duration,
        COALESCE(MAX(duration), INTERVAL '0') as longest_incident,
        COALESCE(AVG(duration), INTERVAL '0') as mttr
    FROM incidents;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. TIME SERIES DATA FOR CHARTING
-- =============================================================================
CREATE OR REPLACE FUNCTION get_monitor_timeseries(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT '30days',
    bucket_size TEXT DEFAULT '1 hour'
)
RETURNS TABLE(
    time_bucket TIMESTAMP WITH TIME ZONE,
    avg_latency NUMERIC,
    uptime_percentage NUMERIC,
    total_checks BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        time_bucket(bucket_size::INTERVAL, mt."createdAt") AS time_bucket,
        ROUND(AVG(mt."latency")::NUMERIC, 2) AS avg_latency,
        ROUND((COUNT(CASE WHEN mt."status" = 'GOOD' THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2) AS uptime_percentage,
        COUNT(*) AS total_checks
    FROM "MonitorTick" mt
    WHERE mt."monitorId" = monitor_id_param
        AND mt."createdAt" >= NOW() - get_time_range(period_param)
    GROUP BY time_bucket
    ORDER BY time_bucket ASC;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- EXAMPLE USAGE QUERIES
-- =============================================================================

-- Example usage for a specific monitor:
/*
-- Get average latency by country for the last week
SELECT * FROM get_avg_latency_by_country('your-monitor-uuid', '1week');

-- Get uptime data for the last 30 days  
SELECT * FROM get_uptime_data('your-monitor-uuid', '30days');

-- Get time series data with hourly buckets for the last 7 days
SELECT * FROM get_monitor_timeseries('your-monitor-uuid', '1week', '1 hour');

-- Get best performing region
SELECT * FROM get_best_performing_region('your-monitor-uuid', '30days');
*/