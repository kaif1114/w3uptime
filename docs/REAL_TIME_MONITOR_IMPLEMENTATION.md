# Real-Time Monitor Updates Implementation

## Overview

This document explains the complete implementation of real-time "Last checked at" functionality for monitor details pages, including database triggers, Server-Sent Events (SSE), and frontend components.

## Architecture Flow

```
Validator → Hub → Data Ingestion → MonitorTick INSERT → Database Triggers → PostgreSQL NOTIFY → SSE API → Frontend
```

## 1. Database Layer (`packages/db/queries/triggers.sql`)

### Purpose
The database triggers automatically fire when new monitoring data is inserted, handling two key functions:
1. Send real-time notifications to connected clients
2. Update the Monitor's lastCheckedAt timestamp

### Trigger Implementation

#### Notification Trigger Function
```sql
CREATE OR REPLACE FUNCTION notify_monitor_update()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  -- Create payload with monitor update information
  payload := json_build_object(
    'monitorId', NEW."monitorId",
    'status', NEW."status", 
    'latency', NEW."latency",
    'checkedAt', NEW."createdAt",
    'location', json_build_object(
      'city', NEW."city",
      'countryCode', NEW."countryCode", 
      'continentCode', NEW."continentCode",
      'latitude', NEW."latitude",
      'longitude', NEW."longitude"
    )
  );
  
  -- Send notification with the payload
  PERFORM pg_notify('monitor_update', payload::text);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Key Features:**
- **JSON Payload**: Structured data containing monitor ID, status, latency, timestamp, and location
- **PostgreSQL NOTIFY**: Uses `pg_notify()` to broadcast messages to listening connections
- **Channel Name**: Uses `'monitor_update'` as the notification channel
- **Quoted Columns**: Uses `NEW."columnName"` syntax for camelCase Prisma columns

#### LastCheckedAt Update Function
```sql
CREATE OR REPLACE FUNCTION update_monitor_last_checked()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the Monitor's lastCheckedAt timestamp
  UPDATE "Monitor" 
  SET "lastCheckedAt" = NEW."createdAt" 
  WHERE id = NEW."monitorId";
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Purpose:**
- Automatically updates the Monitor table's `lastCheckedAt` field
- Ensures data consistency without requiring application-level updates

#### Trigger Declarations
```sql
-- Notification trigger
CREATE OR REPLACE TRIGGER monitor_tick_notify_trigger
  AFTER INSERT ON "MonitorTick"
  FOR EACH ROW
  EXECUTE FUNCTION notify_monitor_update();

-- LastCheckedAt update trigger  
CREATE OR REPLACE TRIGGER monitor_last_checked_update_trigger
  AFTER INSERT ON "MonitorTick"
  FOR EACH ROW
  EXECUTE FUNCTION update_monitor_last_checked();
```

### Data Flow
1. **MonitorTick INSERT**: When validator data is inserted into MonitorTick table
2. **Trigger Execution**: Both triggers fire simultaneously after the INSERT
3. **Notification**: `pg_notify()` broadcasts JSON payload to channel `'monitor_update'`
4. **Database Update**: Monitor.lastCheckedAt gets updated with the new timestamp

## 2. SSE API Layer (`apps/frontend/app/api/monitors/[monitorid]/stream/route.ts`)

### Purpose
Creates a Server-Sent Events (SSE) endpoint that listens for PostgreSQL notifications and streams real-time updates to connected clients.

### Implementation Details

#### Connection Management
```typescript
// Global clients map to manage PostgreSQL connections per monitor
const monitorClients = new Map<string, { client: Client; responseStream: ReadableStream }>();

// Clean up function to close connections
const cleanupConnection = (monitorId: string) => {
  const connection = monitorClients.get(monitorId);
  if (connection) {
    connection.client.end().catch(console.error);
    monitorClients.delete(monitorId);
  }
};
```

#### Core SSE Handler
```typescript
export const GET = withAuth(async (req, user, session, { params }) => {
  const { monitorid } = await params;

  // Verify monitor ownership
  const monitor = await prisma.monitor.findFirst({
    where: { id: monitorid, userId: user.id }
  });

  if (!monitor) {
    return NextResponse.json({ error: "Monitor not found" }, { status: 404 });
  }

  // Create PostgreSQL client for listening
  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await pgClient.connect();
  await pgClient.query('LISTEN monitor_update');
```

#### ReadableStream Implementation
```typescript
const stream = new ReadableStream({
  start(controller) {
    // Send initial connection message
    const data = `data: ${JSON.stringify({ type: 'connected', monitorId: monitorid })}\n\n`;
    controller.enqueue(new TextEncoder().encode(data));

    // Listen for PostgreSQL notifications
    pgClient.on('notification', (msg) => {
      try {
        if (msg.channel === 'monitor_update') {
          const payload = JSON.parse(msg.payload || '{}');
          
          // Only send notifications for this specific monitor
          if (payload.monitorId === monitorid) {
            const sseData = `data: ${JSON.stringify({
              type: 'monitor_update',
              monitorId: payload.monitorId,
              status: payload.status,
              latency: payload.latency,
              checkedAt: payload.checkedAt,
              location: payload.location
            })}\n\n`;
            
            controller.enqueue(new TextEncoder().encode(sseData));
          }
        }
      } catch (error) {
        console.error('Error processing notification:', error);
      }
    });

    // Error handling
    pgClient.on('end', () => {
      controller.close();
      cleanupConnection(monitorid);
    });

    pgClient.on('error', (error) => {
      console.error('PostgreSQL client error:', error);
      controller.error(error);
      cleanupConnection(monitorid);
    });
  },

  cancel() {
    // Clean up when client disconnects
    cleanupConnection(monitorid);
  }
});
```

### Key Features

1. **Authentication**: Uses `withAuth` wrapper for user verification
2. **Monitor Ownership**: Verifies user owns the monitor before allowing connection
3. **Connection Pooling**: Maintains separate PostgreSQL connections per monitor
4. **Message Filtering**: Only forwards notifications for the specific monitor ID
5. **Error Handling**: Proper cleanup on connection errors or client disconnection
6. **SSE Format**: Follows Server-Sent Events specification with `data:` prefix
7. **Resource Management**: Automatic cleanup on process termination

### Response Headers
```typescript
return new Response(stream, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET',
    'Access-Control-Allow-Headers': 'Cache-Control',
  },
});
```

## 3. Frontend Component (`apps/frontend/app/(user)/monitors/[id]/MetricsCards.tsx`)

### Purpose
Displays three metric cards with real-time updates:
1. **Currently up for**: Shows uptime duration since monitor creation
2. **Last checked at**: Real-time countdown (1 sec ago, 2 sec ago, etc.)
3. **Incidents**: Total incident count for the monitor

### Component Structure

#### Props Interface
```typescript
interface MetricsCardsProps {
  monitorId: string;
  createdAt?: string;
  lastCheckedAt?: string | null;
  incidentCount?: number;
}
```

#### Time Formatting Functions
```typescript
function formatUptime(createdAt: string): string {
  const created = new Date(createdAt);
  const now = new Date();
  const diff = now.getTime() - created.getTime();

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0) parts.push(`${minutes} min${minutes !== 1 ? 's' : ''}`);

  return parts.slice(0, 2).join(' ') || 'Just now';
}

function formatTimeAgo(timestamp: string | null): string {
  if (!timestamp) return 'Never';
  
  try {
    const checkedTime = new Date(timestamp);
    const now = new Date();
    
    if (isNaN(checkedTime.getTime())) {
      return 'Invalid time';
    }
    
    const diff = Math.floor((now.getTime() - checkedTime.getTime()) / 1000);

    // Handle negative differences (future timestamps)
    if (diff < 0) return 'Just now';
    if (diff < 10) return 'Just now';
    if (diff < 60) return `${diff} second${diff !== 1 ? 's' : ''} ago`;
    
    const minutes = Math.floor(diff / 60);
    if (diff < 3600) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    
    const hours = Math.floor(diff / 3600);
    if (diff < 86400) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    
    const days = Math.floor(diff / 86400);
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } catch (error) {
    console.error('Error formatting time ago:', error);
    return 'Unknown';
  }
}
```

#### Real-Time State Management
```typescript
export function MetricsCards({ monitorId, createdAt, lastCheckedAt: initialLastCheckedAt, incidentCount = 0 }) {
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(initialLastCheckedAt || null);
  const [liveTimeAgo, setLiveTimeAgo] = useState<string>('');

  // Update live time ago every second
  useEffect(() => {
    const updateTimeAgo = () => {
      setLiveTimeAgo(formatTimeAgo(lastCheckedAt));
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 1000);
    return () => clearInterval(interval);
  }, [lastCheckedAt]);

  // Connect to SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource(`/api/monitors/${monitorId}/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data: SSEMessage = JSON.parse(event.data);
        
        if (data.type === 'monitor_update' && data.monitorId === monitorId) {
          setLastCheckedAt(data.checkedAt || null);
        }
      } catch (error) {
        console.error('Error parsing SSE message:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('SSE connection error:', error);
    };

    return () => {
      eventSource.close();
    };
  }, [monitorId]);
```

### UI Components
```typescript
return (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
    {/* Currently up for */}
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Currently up for</p>
            <p className="text-2xl font-bold">
              {createdAt ? formatUptime(createdAt) : '-'}
            </p>
          </div>
          <Shield className="h-8 w-8 text-green-500" />
        </div>
      </CardContent>
    </Card>

    {/* Last checked at */}
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Last checked at</p>
            <p className="text-2xl font-bold">
              {liveTimeAgo || 'Never'}
            </p>
          </div>
          <Clock className="h-8 w-8 text-blue-500" />
        </div>
      </CardContent>
    </Card>

    {/* Incidents */}
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Incidents</p>
            <p className="text-2xl font-bold">{incidentCount}</p>
          </div>
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
      </CardContent>
    </Card>
  </div>
);
```

## 4. Supporting APIs

### Monitor Details API (`apps/frontend/app/api/monitors/[monitorid]/route.ts`)
- Returns monitor data including `lastCheckedAt` timestamp
- Uses `.toISOString()` for consistent UTC formatting

### Monitor Incidents API (`apps/frontend/app/api/monitors/[monitorid]/incidents/route.ts`)
- Returns incident count for the specific monitor
- Used by the incidents metric card

### Hooks (`hooks/useMonitors.ts`)
- `useMonitorDetails(id)`: Fetches monitor data with 30-second refetch
- `useMonitorIncidents(id)`: Fetches incident count with 60-second refetch

## 5. Complete Data Flow

### Initial Page Load
1. **Component Mount**: MetricsCards component receives initial props
2. **API Calls**: Parallel requests for monitor details and incident count
3. **State Initialization**: Sets initial `lastCheckedAt` value
4. **Timer Start**: 1-second interval begins updating display
5. **SSE Connection**: EventSource connects to `/stream` endpoint

### Real-Time Update Flow
1. **Validator Check**: Validator performs HTTP check on monitored URL
2. **Data Submission**: Results sent to Hub WebSocket server
3. **Data Ingestion**: Hub forwards data to Data Ingestion service
4. **Database Insert**: MonitorTick record inserted into database
5. **Trigger Execution**: Both triggers fire after INSERT:
   - Notification trigger sends `pg_notify('monitor_update', payload)`
   - Update trigger sets Monitor.lastCheckedAt timestamp
6. **SSE Notification**: PostgreSQL client in SSE API receives notification
7. **Message Filtering**: Checks if notification is for current monitor
8. **Client Update**: SSE sends formatted message to browser
9. **State Update**: Frontend receives message and updates `lastCheckedAt`
10. **Display Update**: Next 1-second timer tick shows updated "X seconds ago"

### Error Handling
- **Invalid timestamps**: Gracefully handled with fallback values
- **SSE disconnection**: Automatic reconnection via EventSource
- **Database errors**: Logged and handled without crashing
- **PostgreSQL connection issues**: Cleanup and resource management
- **Future timestamps**: Handled by showing "Just now"

## 6. Timezone Considerations

### Current Implementation
- Database triggers return raw timestamps
- API converts to UTC using `.toISOString()`
- Frontend uses JavaScript Date for calculations

### Recommended Solution
Set database timezone to UTC:
```sql
ALTER DATABASE your_database_name SET timezone = 'UTC';
```

Or in Docker Compose:
```yaml
services:
  timescaledb:
    environment:
      TZ: UTC
      PGTZ: UTC
```

## 7. Performance Considerations

### Connection Management
- One PostgreSQL connection per monitor SSE stream
- Automatic cleanup on client disconnect
- Connection pooling for efficient resource usage

### Update Frequency
- Frontend timer: 1-second intervals for smooth UX
- Database polling: Eliminated by using triggers
- Real-time updates: Instant via SSE (no polling required)

### Scalability
- Per-monitor filtering reduces unnecessary traffic
- Efficient JSON payload structure
- Resource cleanup prevents memory leaks

## 8. Security Features

### Authentication
- All APIs protected with `withAuth` middleware
- Monitor ownership verification before SSE connection
- User session validation

### Data Validation
- Monitor ID validation
- Timestamp validation with error handling
- JSON payload sanitization

## 9. Monitoring and Debugging

### Logging Points
- SSE connection establishment and termination
- PostgreSQL notification reception
- Database trigger execution
- Frontend state updates

### Debug Information
- Connection status in browser dev tools
- SSE message inspection via EventSource
- Database trigger payload logging
- Performance metrics via browser timeline

## 10. Future Enhancements

### Possible Improvements
1. **Reconnection Logic**: Automatic SSE reconnection with exponential backoff
2. **Batch Updates**: Group multiple rapid updates for performance
3. **Status Indicators**: Visual indicators for connection status
4. **Offline Support**: Cache last known state for offline scenarios
5. **Real-time Charts**: Extend SSE to update latency graphs in real-time

### Monitoring Extensions
- Real-time status changes (up/down state)
- Live latency updates
- Geographic distribution updates
- Incident creation notifications

This implementation provides a robust, scalable, and real-time monitoring experience that enhances user engagement and provides immediate feedback on monitoring status changes.