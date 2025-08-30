import React from 'react'
import { CheckCircle, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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

interface ServicesSectionProps {
  sections: Section[];
  maintenances?: any[];
  updates?: any[];
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({ 
  sections, 
  maintenances = [], 
  updates = [] 
}) => {
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

  return (
    <Tabs defaultValue="services" className="space-y-6">
      <TabsList>
        <TabsTrigger value="services">Services</TabsTrigger>
        {maintenances.length > 0 && (
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        )}
        {updates.length > 0 && (
          <TabsTrigger value="updates">Updates</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="services" className="space-y-6">
        {sections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {section.monitors.map((monitor) => (
                  <div key={monitor.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(monitor.status)}
                      <div>
                        <h3 className="font-medium text-foreground">{monitor.name}</h3>
                        <p className="text-sm text-muted-foreground">{monitor.url}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">
                          {monitor.uptime.toFixed(2)}% uptime
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {monitor.responseTime}ms avg response
                        </p>
                      </div>
                      <Badge variant={monitor.status === 'up' ? 'default' : 'destructive'}>
                        {getStatusText(monitor.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </TabsContent>

      {maintenances.length > 0 && (
        <TabsContent value="maintenance" className="space-y-6">
          {/* Add maintenance content here when needed */}
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">No scheduled maintenances</p>
            </CardContent>
          </Card>
        </TabsContent>
      )}

      {updates.length > 0 && (
        <TabsContent value="updates" className="space-y-6">
          {/* Add updates content here when needed */}
          <Card>
            <CardContent className="p-6">
              <p className="text-muted-foreground">No recent updates</p>
            </CardContent>
          </Card>
        </TabsContent>
      )}
    </Tabs>
  );
};