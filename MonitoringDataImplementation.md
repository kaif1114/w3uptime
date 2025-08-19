# Monitoring Data Implementation

## Bucket Size, Period, and Resolution Explanation

Based on the codebase analysis, here's how the time-series data system works in your W3Uptime frontend:

### **Key Concepts:**

**1. Period** - The time range for data analysis:
- `1hr`, `1day`, `3days`, `1week`, `2weeks`, `30days`, `90days`
- Controls how far back in time to fetch data from TimescaleDB
- Defined in `MonitoringControls.tsx:9` and used in SQL functions

**2. Bucket Size (Resolution)** - Data aggregation intervals:
- `1 minute`, `5 minutes`, `15 minutes`, `30 minutes`, `1 hour`, `4 hours`, `1 day`
- Controls how TimescaleDB groups monitoring data points together
- Labeled as "Resolution" in the UI (`MonitoringControls.tsx:86`)

**3. Resolution** - Same as bucket size, represents chart granularity

### **Data Fetching Architecture:**

**TimescaleDB Setup:**
- `MonitorTick` table converted to hypertable with 1-day chunks (`queries.sql:7-10`)
- Continuous aggregates for hourly data (`queries.sql:29-45`)
- Optimized indexes for time-series queries

**API Endpoints:**
- Analytics: `/api/monitors/[id]/analytics?period=30days`
- Time Series: `/api/monitors/[id]/timeseries?period=30days&bucket=1%20hour`

**Data Flow:**
1. Frontend calls `useMonitorTimeSeries()` hook (`useMonitors.ts:229`)
2. Fetches from TimescaleDB using `get_monitor_timeseries()` function (`queries.sql:303-327`)
3. Data aggregated by `time_bucket()` function with specified bucket size
4. Returns aggregated latency, uptime percentage, and total checks per time bucket

### **Update Frequency:**

**Real-time Updates:**
- Monitor details: Refetch every **30 seconds** (`useMonitors.ts:73`)
- Analytics data: Refetch every **60 seconds** (`useMonitors.ts:223`)
- Time series data: Refetch every **60 seconds** (`useMonitors.ts:245`)
- Data considered stale after **30 seconds** (`useMonitors.ts:224,246`)

**Manual Refresh:**
- Users can manually refresh via the refresh button
- Auto-refresh can be toggled on/off (`MonitoringControls.tsx:102-111`)

### **How It Works:**
The system uses TimescaleDB's `time_bucket()` function to aggregate raw monitoring ticks into meaningful chart data. For example, with `bucket='1 hour'` and `period='30days'`, it creates 720 data points (30 days × 24 hours), each representing the average latency and uptime percentage for that hour.

The frontend displays this data in responsive charts (`TimeSeriesChart.tsx`) that automatically adjust formatting based on the selected bucket size - showing dates for daily buckets and timestamps for hourly/minute buckets.

## Overview Tab vs Performance Tab Analysis

### **Overview Tab Implementation:**

**Component:** `AnalyticsOverview.tsx`
**Data Hook:** `useMonitorAnalytics(monitorId, period)` (`useMonitors.ts:207`)

**Data Source & SQL Functions:**
- **API Endpoint:** `/api/monitors/[id]/analytics?period=30days`
- **SQL Functions Used:**
  1. `get_uptime_data()` - Total/successful/failed checks, uptime percentage
  2. `get_total_avg_latency()` - Average, min, max latency with sample counts
  3. `get_downtime_data()` - Incident counts, durations, MTTR
  4. `get_best_performing_region()` - Lowest latency region
  5. `get_avg_latency_by_country()` - Country-wise performance
  6. `get_avg_latency_by_continent()` - Continent-wise performance  
  7. `get_avg_latency_by_city()` - City-wise performance

**Data Displayed:**
- Uptime percentage with progress bar
- Average/min/max latency statistics
- Downtime incidents and durations
- Best performing region (country/continent/city)
- Top 5 performing countries ranking
- MTTR (Mean Time To Recovery)

### **Performance Tab Implementation:**

**Component:** `TimeSeriesChart.tsx` (two instances)
**Data Hook:** `useMonitorTimeSeries(monitorId, period, bucketSize)` (`useMonitors.ts:229`)

**Data Source & SQL Functions:**
- **API Endpoint:** `/api/monitors/[id]/timeseries?period=30days&bucket=1%20hour`
- **SQL Function Used:**
  1. `get_monitor_timeseries()` - Time-bucketed aggregated data

**Data Displayed:**
- Response Time Over Time (area chart)
- Uptime Over Time (area chart)
- Both charts show data points grouped by bucket size (resolution)

### **Update Frequency Comparison:**

**Overview Tab:**
- **Refetch Interval:** Every **60 seconds** (`useMonitors.ts:223`)
- **Stale Time:** **30 seconds** (`useMonitors.ts:224`)
- **Fresh Data Indication:** Data considered stale after 30 seconds, triggering background refetch

**Performance Tab:**
- **Refetch Interval:** Every **60 seconds** (`useMonitors.ts:245`) 
- **Stale Time:** **30 seconds** (`useMonitors.ts:246`)
- **Fresh Data Indication:** Same staleness behavior as Overview

### **Key Differences:**

**Data Complexity:**
- **Overview:** Aggregated summary statistics (single values per metric)
- **Performance:** Time-series arrays for charting (multiple data points over time)

**SQL Query Performance:**
- **Overview:** Executes 7 SQL functions in parallel for comprehensive analytics
- **Performance:** Single SQL function but processes more data points for charts

**UI Responsiveness:**
- **Overview:** Shows loading skeletons for 6 cards during data fetch
- **Performance:** Shows loading state for individual charts

## Data Aggregation and Update Intervals

### **Backend Data Aggregation:**

**TimescaleDB Continuous Aggregates:**
- **Hourly Aggregation:** Continuous aggregate `monitor_tick_hourly` processes raw `MonitorTick` data
- **Refresh Policy:** Aggregates refresh every **1 hour** (`queries.sql:48-51`)
- **Lag Configuration:** 
  - Start offset: **3 hours** (processes data older than 3 hours)
  - End offset: **1 hour** (leaves 1-hour buffer for late-arriving data)

**Raw Data Availability:**
- Fresh `MonitorTick` records inserted in real-time as validators report
- Hub distributes monitoring tasks every **60 seconds** (per CLAUDE.md)
- Validators report back immediately after checks complete

### **Frontend Data Freshness:**

**Query Behavior:**
- React Query cache invalidation happens every 30 seconds (stale time)
- Background refetch occurs every 60 seconds (refetch interval)
- **Critical Gap:** Frontend assumes data updates every 60 seconds, but:
  - Continuous aggregates only refresh hourly
  - This means aggregated data in charts can be up to 1 hour old
  - Raw query functions bypass continuous aggregates, so they get fresh data

**Real Data Update Flow:**
1. **New MonitorTick arrives** → Immediately available in raw table
2. **Frontend queries** → Gets fresh data via direct table queries (not continuous aggregates)
3. **60-second frontend refresh** → Actually shows updated data because SQL functions query raw table
4. **Hourly aggregate refresh** → Updates materialized view (not directly used by frontend)

### **Data Freshness Reality:**

**What Frontend Shows:**
- **Actually Fresh:** Overview and Performance tabs show data as fresh as the latest `MonitorTick` records
- **Update Frequency:** New data appears within 60 seconds of validator reporting
- **No Aggregation Delay:** SQL functions like `get_monitor_timeseries()` query raw `MonitorTick` table directly

**Why It Works:**
The frontend refresh intervals (30s stale time, 60s refetch) effectively show updated data because:
- All SQL functions query the raw `MonitorTick` table, not the continuous aggregates
- Raw data is available immediately when validators report
- The 60-second frontend refresh successfully captures new monitoring data

**Continuous Aggregate Purpose:**
- The `monitor_tick_hourly` view exists for potential future performance optimization
- Currently not used by frontend queries, which explains why data freshness works despite hourly aggregate refresh