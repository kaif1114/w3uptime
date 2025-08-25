-- Database trigger for monitor updates
-- This trigger fires when a new MonitorTick is inserted and notifies connected listeners

CREATE OR REPLACE FUNCTION notify_monitor_update()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  -- Create payload with monitor update information
  payload := json_build_object(
    'monitorId', NEW.monitorId,
    'status', NEW.status,
    'latency', NEW.latency,
    'checkedAt', NEW.createdAt,
    'location', json_build_object(
      'city', NEW.city,
      'countryCode', NEW.countryCode,
      'continentCode', NEW.continentCode,
      'latitude', NEW.latitude,
      'longitude', NEW.longitude
    )
  );
  
  -- Send notification with the payload
  PERFORM pg_notify('monitor_update', payload::text);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that fires after MonitorTick insert
CREATE OR REPLACE TRIGGER monitor_tick_notify_trigger
  AFTER INSERT ON "MonitorTick"
  FOR EACH ROW
  EXECUTE FUNCTION notify_monitor_update();

-- Additional trigger to update the lastCheckedAt field in Monitor table
CREATE OR REPLACE FUNCTION update_monitor_last_checked()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the Monitor's lastCheckedAt timestamp
  UPDATE "Monitor" 
  SET "lastCheckedAt" = NEW.createdAt 
  WHERE id = NEW.monitorId;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger that updates lastCheckedAt after MonitorTick insert
CREATE OR REPLACE TRIGGER monitor_last_checked_update_trigger
  AFTER INSERT ON "MonitorTick"
  FOR EACH ROW
  EXECUTE FUNCTION update_monitor_last_checked();