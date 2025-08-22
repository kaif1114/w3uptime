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

-- =============================================================================
-- CONTINUOUS AGGREGATES SETUP
-- =============================================================================

-- 4a. Create 5-minute continuous aggregate (for hour period)
CREATE MATERIALIZED VIEW monitor_tick_5min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('5 minutes', "createdAt") AS time_bucket,
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
GROUP BY time_bucket, "monitorId", "countryCode", "continentCode", "city", "status";

-- 4b. Create 15-minute continuous aggregate (for day period)
CREATE MATERIALIZED VIEW monitor_tick_15min
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('15 minutes', "createdAt") AS time_bucket,
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
GROUP BY time_bucket, "monitorId", "countryCode", "continentCode", "city", "status";

-- 4c. Create hourly continuous aggregate (for week period)
CREATE MATERIALIZED VIEW monitor_tick_hourly
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('1 hour', "createdAt") AS time_bucket,
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
GROUP BY time_bucket, "monitorId", "countryCode", "continentCode", "city", "status";

-- 4d. Create 6-hour continuous aggregate (for month period)
CREATE MATERIALIZED VIEW monitor_tick_6hour
WITH (timescaledb.continuous) AS
SELECT 
    time_bucket('6 hours', "createdAt") AS time_bucket,
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
GROUP BY time_bucket, "monitorId", "countryCode", "continentCode", "city", "status";

-- =============================================================================
-- REFRESH POLICIES (Staggered for performance)
-- =============================================================================

-- 5-minute aggregate refresh policy (keep only last 2 hours of data)
SELECT add_continuous_aggregate_policy('monitor_tick_5min',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '5 minutes',
    schedule_interval => INTERVAL '5 minutes');

-- 15-minute aggregate refresh policy (keep only last 2 days of data)
SELECT add_continuous_aggregate_policy('monitor_tick_15min',
    start_offset => INTERVAL '2 days',
    end_offset => INTERVAL '15 minutes',
    schedule_interval => INTERVAL '15 minutes');

-- Hourly aggregate refresh policy (keep only last 8 days of data)
SELECT add_continuous_aggregate_policy('monitor_tick_hourly',
    start_offset => INTERVAL '8 days',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour');

-- 6-hour aggregate refresh policy (keep all data older than 8 days)
SELECT add_continuous_aggregate_policy('monitor_tick_6hour',
    start_offset => INTERVAL '32 days',
    end_offset => INTERVAL '6 hours',
    schedule_interval => INTERVAL '6 hours');

-- =============================================================================
-- RETENTION POLICIES (Optional - to manage storage)
-- =============================================================================

-- Keep 5-minute aggregates for only 2 hours
SELECT add_retention_policy('monitor_tick_5min', INTERVAL '2 hours');

-- Keep 15-minute aggregates for only 2 days
SELECT add_retention_policy('monitor_tick_15min', INTERVAL '2 days');

-- Keep hourly aggregates for only 8 days
SELECT add_retention_policy('monitor_tick_hourly', INTERVAL '8 days');

-- Keep 6-hour aggregates indefinitely (no retention policy)

-- =============================================================================
-- UTILITY FUNCTIONS
-- =============================================================================

-- Enhanced function to get time range and appropriate granularity
CREATE OR REPLACE FUNCTION get_time_range_and_granularity(period_type TEXT)
RETURNS TABLE(time_range INTERVAL, granularity TEXT, aggregate_view TEXT) AS $$
BEGIN
    CASE period_type
        WHEN 'hour' THEN 
            RETURN QUERY SELECT INTERVAL '1 hour', '5 minutes'::TEXT, 'monitor_tick_5min'::TEXT;
        WHEN 'day' THEN 
            RETURN QUERY SELECT INTERVAL '1 day', '15 minutes'::TEXT, 'monitor_tick_15min'::TEXT;
        WHEN 'week' THEN 
            RETURN QUERY SELECT INTERVAL '1 week', '1 hour'::TEXT, 'monitor_tick_hourly'::TEXT;
        WHEN 'month' THEN 
            RETURN QUERY SELECT INTERVAL '30 days', '6 hours'::TEXT, 'monitor_tick_6hour'::TEXT;
        ELSE 
            RETURN QUERY SELECT INTERVAL '1 day', '15 minutes'::TEXT, 'monitor_tick_15min'::TEXT;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Legacy function for backward compatibility
CREATE OR REPLACE FUNCTION get_time_range(period_type TEXT)
RETURNS INTERVAL AS $$
DECLARE
    range_result INTERVAL;
BEGIN
    SELECT time_range INTO range_result 
    FROM get_time_range_and_granularity(period_type) 
    LIMIT 1;
    
    RETURN COALESCE(range_result, INTERVAL '1 day');
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- OPTIMIZED QUERY FUNCTIONS
-- =============================================================================

-- =============================================================================
-- 1. AVERAGE LATENCY BY COUNTRY (Optimized)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_avg_latency_by_country(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT 'day'
)
RETURNS TABLE(
    country_code TEXT,
    avg_latency NUMERIC,
    sample_count BIGINT
) AS $$
DECLARE
    query_info RECORD;
    query_text TEXT;
BEGIN
    -- Get appropriate aggregate view and time range
    SELECT * INTO query_info FROM get_time_range_and_granularity(period_param) LIMIT 1;
    
    -- Build dynamic query based on appropriate aggregate
    query_text := FORMAT('
        SELECT 
            agg."countryCode"::TEXT,
            ROUND(
                (SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0))::NUMERIC, 
                2
            ) AS avg_latency,
            SUM(agg.tick_count) AS sample_count
        FROM %I agg
        WHERE agg."monitorId" = $1
            AND agg.time_bucket >= NOW() - $2::INTERVAL
        GROUP BY agg."countryCode"
        ORDER BY avg_latency ASC',
        query_info.aggregate_view
    );
    
    RETURN QUERY EXECUTE query_text USING monitor_id_param, query_info.time_range;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 2. AVERAGE LATENCY BY CONTINENT (Optimized)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_avg_latency_by_continent(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT 'day'
)
RETURNS TABLE(
    continent_code TEXT,
    avg_latency NUMERIC,
    sample_count BIGINT
) AS $$
DECLARE
    query_info RECORD;
    query_text TEXT;
BEGIN
    SELECT * INTO query_info FROM get_time_range_and_granularity(period_param) LIMIT 1;
    
    query_text := FORMAT('
        SELECT 
            agg."continentCode"::TEXT,
            ROUND(
                (SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0))::NUMERIC, 
                2
            ) AS avg_latency,
            SUM(agg.tick_count) AS sample_count
        FROM %I agg
        WHERE agg."monitorId" = $1
            AND agg.time_bucket >= NOW() - $2::INTERVAL
        GROUP BY agg."continentCode"
        ORDER BY avg_latency ASC',
        query_info.aggregate_view
    );
    
    RETURN QUERY EXECUTE query_text USING monitor_id_param, query_info.time_range;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 3. AVERAGE LATENCY BY CITY (Optimized)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_avg_latency_by_city(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT 'day'
)
RETURNS TABLE(
    city TEXT,
    country_code TEXT,
    avg_latency NUMERIC,
    sample_count BIGINT
) AS $$
DECLARE
    query_info RECORD;
    query_text TEXT;
BEGIN
    SELECT * INTO query_info FROM get_time_range_and_granularity(period_param) LIMIT 1;
    
    query_text := FORMAT('
        SELECT 
            agg."city"::TEXT,
            agg."countryCode"::TEXT,
            ROUND(
                (SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0))::NUMERIC, 
                2
            ) AS avg_latency,
            SUM(agg.tick_count) AS sample_count
        FROM %I agg
        WHERE agg."monitorId" = $1
            AND agg.time_bucket >= NOW() - $2::INTERVAL
        GROUP BY agg."city", agg."countryCode"
        ORDER BY avg_latency ASC',
        query_info.aggregate_view
    );
    
    RETURN QUERY EXECUTE query_text USING monitor_id_param, query_info.time_range;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 4. BEST AND WORST PERFORMING REGIONS (Optimized)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_best_performing_region(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT 'day'
)
RETURNS TABLE(
    region_type TEXT,
    region_name TEXT,
    avg_latency NUMERIC,
    sample_count BIGINT
) AS $$
DECLARE
    query_info RECORD;
    query_text TEXT;
BEGIN
    SELECT * INTO query_info FROM get_time_range_and_granularity(period_param) LIMIT 1;
    
    query_text := FORMAT('
        WITH regional_performance AS (
            SELECT ''Country'' as region_type, agg."countryCode" as region_name, 
                   SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0) as avg_latency, 
                   SUM(agg.tick_count) as sample_count
            FROM %I agg
            WHERE agg."monitorId" = $1
                AND agg.time_bucket >= NOW() - $2::INTERVAL
            GROUP BY agg."countryCode"
            
            UNION ALL
            
            SELECT ''Continent'' as region_type, agg."continentCode" as region_name,
                   SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0) as avg_latency, 
                   SUM(agg.tick_count) as sample_count
            FROM %I agg
            WHERE agg."monitorId" = $1
                AND agg.time_bucket >= NOW() - $2::INTERVAL
            GROUP BY agg."continentCode"
            
            UNION ALL
            
            SELECT ''City'' as region_type, agg."city" as region_name,
                   SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0) as avg_latency, 
                   SUM(agg.tick_count) as sample_count
            FROM %I agg
            WHERE agg."monitorId" = $1
                AND agg.time_bucket >= NOW() - $2::INTERVAL
            GROUP BY agg."city"
        )
        SELECT rp.region_type::TEXT, rp.region_name::TEXT, 
               ROUND(rp.avg_latency::NUMERIC, 2), rp.sample_count
        FROM regional_performance rp
        WHERE rp.avg_latency IS NOT NULL
        ORDER BY rp.avg_latency ASC
        LIMIT 1',
        query_info.aggregate_view, query_info.aggregate_view, query_info.aggregate_view
    );
    
    RETURN QUERY EXECUTE query_text USING monitor_id_param, query_info.time_range;
END;
$$ LANGUAGE plpgsql;

-- Function to get worst performing region
CREATE OR REPLACE FUNCTION get_worst_performing_region(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT 'day'
)
RETURNS TABLE(
    region_type TEXT,
    region_name TEXT,
    avg_latency NUMERIC,
    sample_count BIGINT
) AS $$
DECLARE
    query_info RECORD;
    query_text TEXT;
BEGIN
    SELECT * INTO query_info FROM get_time_range_and_granularity(period_param) LIMIT 1;
    
    query_text := FORMAT('
        WITH regional_performance AS (
            SELECT ''Country'' as region_type, agg."countryCode" as region_name, 
                   SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0) as avg_latency, 
                   SUM(agg.tick_count) as sample_count
            FROM %I agg
            WHERE agg."monitorId" = $1
                AND agg.time_bucket >= NOW() - $2::INTERVAL
            GROUP BY agg."countryCode"
            
            UNION ALL
            
            SELECT ''Continent'' as region_type, agg."continentCode" as region_name,
                   SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0) as avg_latency, 
                   SUM(agg.tick_count) as sample_count
            FROM %I agg
            WHERE agg."monitorId" = $1
                AND agg.time_bucket >= NOW() - $2::INTERVAL
            GROUP BY agg."continentCode"
            
            UNION ALL
            
            SELECT ''City'' as region_type, agg."city" as region_name,
                   SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0) as avg_latency, 
                   SUM(agg.tick_count) as sample_count
            FROM %I agg
            WHERE agg."monitorId" = $1
                AND agg.time_bucket >= NOW() - $2::INTERVAL
            GROUP BY agg."city"
        )
        SELECT rp.region_type::TEXT, rp.region_name::TEXT, 
               ROUND(rp.avg_latency::NUMERIC, 2), rp.sample_count
        FROM regional_performance rp
        WHERE rp.avg_latency IS NOT NULL
        ORDER BY rp.avg_latency DESC
        LIMIT 1',
        query_info.aggregate_view, query_info.aggregate_view, query_info.aggregate_view
    );
    
    RETURN QUERY EXECUTE query_text USING monitor_id_param, query_info.time_range;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 5. TOTAL AVERAGE LATENCY (Optimized)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_total_avg_latency(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT 'day'
)
RETURNS TABLE(
    avg_latency NUMERIC,
    min_latency NUMERIC,
    max_latency NUMERIC,
    sample_count BIGINT
) AS $$
DECLARE
    query_info RECORD;
    query_text TEXT;
BEGIN
    SELECT * INTO query_info FROM get_time_range_and_granularity(period_param) LIMIT 1;
    
    query_text := FORMAT('
        SELECT 
            ROUND(
                (SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0))::NUMERIC, 
                2
            ) AS avg_latency,
            ROUND(MIN(agg.min_latency)::NUMERIC, 2) AS min_latency,
            ROUND(MAX(agg.max_latency)::NUMERIC, 2) AS max_latency,
            SUM(agg.tick_count) AS sample_count
        FROM %I agg
        WHERE agg."monitorId" = $1
            AND agg.time_bucket >= NOW() - $2::INTERVAL',
        query_info.aggregate_view
    );
    
    RETURN QUERY EXECUTE query_text USING monitor_id_param, query_info.time_range;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 6. UPTIME DATA (Optimized)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_uptime_data(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT 'day'
)
RETURNS TABLE(
    total_checks BIGINT,
    successful_checks BIGINT,
    failed_checks BIGINT,
    uptime_percentage NUMERIC,
    availability_sla NUMERIC
) AS $$
DECLARE
    query_info RECORD;
    query_text TEXT;
BEGIN
    SELECT * INTO query_info FROM get_time_range_and_granularity(period_param) LIMIT 1;
    
    query_text := FORMAT('
        SELECT 
            SUM(agg.tick_count) AS total_checks,
            SUM(agg.up_count) AS successful_checks,
            SUM(agg.down_count) AS failed_checks,
            ROUND((SUM(agg.up_count)::NUMERIC / NULLIF(SUM(agg.tick_count), 0)::NUMERIC) * 100, 4) AS uptime_percentage,
            ROUND((SUM(agg.up_count)::NUMERIC / NULLIF(SUM(agg.tick_count), 0)::NUMERIC) * 100, 2) AS availability_sla
        FROM %I agg
        WHERE agg."monitorId" = $1
            AND agg.time_bucket >= NOW() - $2::INTERVAL',
        query_info.aggregate_view
    );
    
    RETURN QUERY EXECUTE query_text USING monitor_id_param, query_info.time_range;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 7. TIME SERIES DATA FOR CHARTING (Optimized)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_monitor_timeseries(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT 'day'
)
RETURNS TABLE(
    time_bucket TIMESTAMP WITH TIME ZONE,
    avg_latency NUMERIC,
    uptime_percentage NUMERIC,
    total_checks BIGINT
) AS $$
DECLARE
    query_info RECORD;
    query_text TEXT;
BEGIN
    SELECT * INTO query_info FROM get_time_range_and_granularity(period_param) LIMIT 1;
    
    query_text := FORMAT('
        SELECT 
            agg.time_bucket,
            ROUND(
                (SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0))::NUMERIC, 
                2
            ) AS avg_latency,
            ROUND((SUM(agg.up_count)::NUMERIC / NULLIF(SUM(agg.tick_count), 0)::NUMERIC) * 100, 2) AS uptime_percentage,
            SUM(agg.tick_count) AS total_checks
        FROM %I agg
        WHERE agg."monitorId" = $1
            AND agg.time_bucket >= NOW() - $2::INTERVAL
        GROUP BY agg.time_bucket
        ORDER BY agg.time_bucket ASC',
        query_info.aggregate_view
    );
    
    RETURN QUERY EXECUTE query_text USING monitor_id_param, query_info.time_range;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- 8. SAMPLE COUNT BY COUNTRY (New function for world map)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_sample_count_by_country(
    monitor_id_param TEXT,
    period_param TEXT DEFAULT 'day'
)
RETURNS TABLE(
    country_code TEXT,
    sample_count BIGINT,
    avg_latency NUMERIC
) AS $$
DECLARE
    query_info RECORD;
    query_text TEXT;
BEGIN
    SELECT * INTO query_info FROM get_time_range_and_granularity(period_param) LIMIT 1;
    
    query_text := FORMAT('
        SELECT 
            agg."countryCode"::TEXT,
            SUM(agg.tick_count) AS sample_count,
            ROUND(
                (SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0))::NUMERIC, 
                2
            ) AS avg_latency
        FROM %I agg
        WHERE agg."monitorId" = $1
            AND agg.time_bucket >= NOW() - $2::INTERVAL
        GROUP BY agg."countryCode"
        ORDER BY sample_count DESC',
        query_info.aggregate_view
    );
    
    RETURN QUERY EXECUTE query_text USING monitor_id_param, query_info.time_range;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- CUSTOM TIME RANGE FUNCTIONS (For future use)
-- =============================================================================

-- Function to handle custom time ranges
CREATE OR REPLACE FUNCTION get_monitor_data_custom_range(
    monitor_id_param TEXT,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    desired_granularity TEXT DEFAULT 'auto'
)
RETURNS TABLE(
    time_bucket TIMESTAMP WITH TIME ZONE,
    avg_latency NUMERIC,
    uptime_percentage NUMERIC,
    total_checks BIGINT,
    data_source TEXT
) AS $$
DECLARE
    time_diff INTERVAL;
    chosen_granularity TEXT;
    aggregate_view TEXT;
    query_text TEXT;
BEGIN
    time_diff := end_time - start_time;
    
    -- Auto-select granularity based on time range
    IF desired_granularity = 'auto' THEN
        IF time_diff <= INTERVAL '2 hours' THEN
            chosen_granularity := '5 minutes';
            aggregate_view := 'monitor_tick_5min';
        ELSIF time_diff <= INTERVAL '2 days' THEN
            chosen_granularity := '15 minutes';
            aggregate_view := 'monitor_tick_15min';
        ELSIF time_diff <= INTERVAL '8 days' THEN
            chosen_granularity := '1 hour';
            aggregate_view := 'monitor_tick_hourly';
        ELSE
            chosen_granularity := '6 hours';
            aggregate_view := 'monitor_tick_6hour';
        END IF;
    ELSE
        chosen_granularity := desired_granularity;
        -- Map granularity to appropriate view
        CASE chosen_granularity
            WHEN '5 minutes' THEN aggregate_view := 'monitor_tick_5min';
            WHEN '15 minutes' THEN aggregate_view := 'monitor_tick_15min';
            WHEN '1 hour' THEN aggregate_view := 'monitor_tick_hourly';
            WHEN '6 hours' THEN aggregate_view := 'monitor_tick_6hour';
            ELSE aggregate_view := 'monitor_tick_15min';
        END CASE;
    END IF;
    
    query_text := FORMAT('
        SELECT 
            agg.time_bucket,
            ROUND(
                (SUM(agg.avg_latency * agg.tick_count) / NULLIF(SUM(agg.tick_count), 0))::NUMERIC, 
                2
            ) AS avg_latency,
            ROUND((SUM(agg.up_count)::NUMERIC / NULLIF(SUM(agg.tick_count), 0)::NUMERIC) * 100, 2) AS uptime_percentage,
            SUM(agg.tick_count) AS total_checks,
            $4::TEXT AS data_source
        FROM %I agg
        WHERE agg."monitorId" = $1
            AND agg.time_bucket >= $2
            AND agg.time_bucket <= $3
        GROUP BY agg.time_bucket
        ORDER BY agg.time_bucket ASC',
        aggregate_view
    );
    
    RETURN QUERY EXECUTE query_text USING monitor_id_param, start_time, end_time, aggregate_view;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- EXAMPLE USAGE QUERIES
-- =============================================================================

/*
-- Examples with new period parameters:

-- Get average latency by country for the last hour (5-minute granularity)
SELECT * FROM get_avg_latency_by_country('your-monitor-uuid', 'hour');

-- Get average latency by country for the last day (15-minute granularity)
SELECT * FROM get_avg_latency_by_country('your-monitor-uuid', 'day');

-- Get average latency by country for the last week (1-hour granularity)
SELECT * FROM get_avg_latency_by_country('your-monitor-uuid', 'week');

-- Get average latency by country for the last month (6-hour granularity)
SELECT * FROM get_avg_latency_by_country('your-monitor-uuid', 'month');

-- Get time series data for charting
SELECT * FROM get_monitor_timeseries('your-monitor-uuid', 'day');

-- Get best and worst performing regions
SELECT * FROM get_best_performing_region('your-monitor-uuid', 'week');
SELECT * FROM get_worst_performing_region('your-monitor-uuid', 'week');

-- Get sample counts by country (for world map coloring)
SELECT * FROM get_sample_count_by_country('your-monitor-uuid', 'day');

-- Custom time range query (future use)
SELECT * FROM get_monitor_data_custom_range(
    'your-monitor-uuid', 
    '2025-01-01 00:00:00+00', 
    '2025-01-07 23:59:59+00', 
    'auto'
);
*/


-------------------------------------------------------------------------------------------------------

-- Check aggregate sizes
-- SELECT 
--     schemaname, tablename,
--     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
-- FROM pg_tables 
-- WHERE tablename LIKE 'monitor_tick_%';

-- -- Check refresh job status
-- SELECT job_id, application_name, last_run_status, next_start
-- FROM timescaledb_information.jobs;