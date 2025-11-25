import React from 'react'
import { format } from 'date-fns'
import { CheckCircle, XCircle, AlertTriangle, Clock, Activity } from 'lucide-react'

interface Monitor {
  id: string;
  name: string;
  url: string;
  status: 'up' | 'down' | 'maintenance';
  uptime: number;
  responseTime: number;
  lastChecked: string;
}

interface Section {
  id: string;
  name: string;
  monitors: Monitor[];
}

interface StatusOverviewProps {
  sections: Section[];
  renderStatusBars?: (monitorId: string) => React.ReactNode;
}

export const StatusOverview: React.FC<StatusOverviewProps> = ({ sections, renderStatusBars }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'up':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'maintenance':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'up':
        return 'Operational';
      case 'down':
        return 'Outage';
      case 'maintenance':
        return 'Maintenance';
      default:
        return 'Unknown';
    }
  };

  const overallStatus = sections.every(section => 
    section.monitors.every(monitor => monitor.status === 'up')
  ) ? 'up' : 'down';

  return (
    <div className="space-y-6 mb-4">
      
      <div className="text-sm text-muted-foreground">
        Last updated on {format(new Date(), 'MMM dd \'at\' h:mm a')} PKT
      </div>

      
   
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>monitor maintenance</span>
            </div>
            <div className="flex items-center space-x-2">
              {getStatusIcon(overallStatus)}
              <span className="text-sm font-medium text-foreground">
                {getStatusText(overallStatus)}
              </span>
            </div>
          </div>
        </div>
        <div>
          {sections.map((section) => (
            <div key={section.id} className="space-y-4">
              {section.monitors.map((monitor) => (
                <div key={monitor.id} className="flex items-center justify-between p-4 border rounded-lg bg-card">
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(monitor.status)}
                    <div>
                      <h3 className="font-medium text-foreground">{monitor.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    
                    {renderStatusBars && (
                      <div className="flex-shrink-0">
                        {renderStatusBars(monitor.id)}
                      </div>
                    )}
                    <span className="text-green-600 font-semibold">{monitor.uptime.toFixed(3)}% uptime</span>
                    <div className="flex items-center space-x-1">
                      {getStatusIcon(monitor.status)}
                      <span className="text-sm text-muted-foreground">{getStatusText(monitor.status)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
  
    </div>
  );
};