import { CardHeader, CardTitle } from '@/components/ui/card';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';



interface ProcessedDataPoint {
  time: string;
  responseTime: number;
  timestamp: number;
  fullDateTime: string;
  date: string;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: ProcessedDataPoint;
  }>;
  label?: string;
}
const generateResponseTimeData = (): ProcessedDataPoint[] => {
  const data = [];
  const startTime = new Date();
  startTime.setHours(12, 0, 0, 0); 
  
  for (let i = 0; i < 480; i++) { 
    const time = new Date(startTime.getTime() + i * 2.5 * 60 * 1000);
    const hours = time.getHours();
    const minutes = time.getMinutes();
    
    
    let baseTime = 0.6;
    if (hours >= 2 && hours <= 6) baseTime = 0.4; 
    if (hours >= 18 && hours <= 22) baseTime = 0.8; 
    
    const responseTime = baseTime + Math.random() * 0.4 + (Math.random() > 0.95 ? 1.5 : 0);
    
    data.push({
      time: time.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: false 
      }),
      responseTime: Math.max(0, responseTime),
      timestamp: time.getTime(),
      fullDateTime: time.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        
        timeZoneName: 'short'
      }),
      date: time.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    });
  }
  
  return data;
};


const generateStatusData = () => {
  const statuses = [];
  for (let i = 0; i < 100; i++) {
    const rand = Math.random();
    let status = 'good';
    if (rand > 0.95) status = 'error';
    else if (rand > 0.85) status = 'warning';
    
    statuses.push(status);
  }
  return statuses;
};


const StatusBar = ({ data }: { data: string[] }) => {
  const getColor = (status: string) => {
    switch (status) {
      case 'good': return 'hsl(var(--chart-1))';
      case 'warning': return 'hsl(var(--chart-2))';
      case 'error': return 'hsl(var(--destructive))';
      default: return 'hsl(var(--muted))';
    }
  };

  return (
    <div className="flex h-6 w-full rounded overflow-hidden mb-4">
      {data.map((status, index) => (
        <div
          key={index}
          className="flex-1 h-full"
          style={{ backgroundColor: getColor(status) }}
        />
      ))}
    </div>
  );
};


const CustomTooltip = ({ active, payload}: TooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
        <div className="font-medium text-card-foreground mb-1">
          {data.fullDateTime} GMT+5 · {data.date}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: 'hsl(var(--chart-1))' }}></div>
          <span className="text-muted-foreground">Response time</span>
          <span className="font-medium text-card-foreground ml-auto"> 
            {payload[0].value.toFixed(2)} s
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const ResponseTimeCharts = () => {
  const responseTimeData = generateResponseTimeData();
  const statusData = generateStatusData();

  return (
    <div className="space-y-6">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Response times</CardTitle>
        </CardHeader>
          <StatusBar data={statusData} />
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={responseTimeData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis 
                  dataKey="time"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  interval={47} 
                />
                <YAxis 
                  domain={[0, 3]}
                  ticks={[0, 1.0, 2.0, 3.0]}
                  tickFormatter={(value) => `${value.toFixed(1)} s`}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                />
                <Tooltip content={<CustomTooltip active={true} payload={[]} label={''} />} />
                <Line 
                  type="monotone" 
                  dataKey="responseTime" 
                  stroke="#3b82f6" 
                  strokeWidth={1.5}
                  dot={false}
                  activeDot={{ r: 4, fill: '#3b82f6', strokeWidth: 2, stroke: '#ffffff' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

        </div>
  );
};

export default ResponseTimeCharts;