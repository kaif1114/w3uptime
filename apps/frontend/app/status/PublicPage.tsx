'use client'
import React, { useState } from 'react'
import Navbar from './Navbar'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { CheckCircle, XCircle, AlertTriangle, Clock, TrendingUp, Activity, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ModeToggle } from '@/components/mode-toggle'
import { MonitorCharts } from './Chart'

// Sample data for demonstration
const sampleStatusPageData = {
  id: '1',
  name: 'Digital Alternatives GCC',
  logoUrl: '/logo.png',
  logoLinkUrl: 'https://digitalalternativesgcc.com',
  supportUrl: 'https://support.digitalalternativesgcc.com',
  sections: [
    {
      id: '1',
      name: 'Core Services',
      monitors: [
        {
          id: '1',
          name: 'digitalalternativesgcc.com',
          url: 'https://digitalalternativesgcc.com',
          status: 'up',
          uptime: 99.985,
          responseTime: 245,
          lastChecked: new Date().toISOString()
        }
      ]
    }
  ],
  maintenances: [],
  updates: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// Sample chart data
const generateSampleChartData = () => {
  const data: Array<{
    timestamp: string;
    responseTime: number;
    uptime: number;
    status: 'up' | 'down' | 'maintenance';
  }> = [];
  const now = new Date();
  
  for (let i = 23; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - (i * 60 * 60 * 1000));
    const responseTime = 200 + Math.random() * 600; // 200-800ms
    const uptime = 95 + Math.random() * 5; // 95-100%
    const status: 'up' | 'down' | 'maintenance' = Math.random() > 0.95 ? 'down' : 'up';
    
    data.push({
      timestamp: timestamp.toISOString(),
      responseTime,
      uptime,
      status
    });
  }
  
  return data;
};

const PublicPage = async ({params}: {params: Promise<{service: string}>}) => {
  const resolvedParams = await params;
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  
  // For demo purposes, use sample data
  const statusPageData = sampleStatusPageData;
  const chartData = generateSampleChartData();

  if (!statusPageData) {
    notFound();
  }

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

  const overallStatus = statusPageData.sections.every(section => 
    section.monitors.every(monitor => monitor.status === 'up')
  ) ? 'up' : 'down';

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        logoUrl={statusPageData.logoUrl}
        companyName={statusPageData.name}
        logoLinkUrl={statusPageData.logoLinkUrl}
        currentPage="status"
        serviceId={resolvedParams.service}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Last Updated */}
        <div className="text-sm text-muted-foreground mb-6">
          Last updated on {format(new Date(), 'MMM dd \'at\' h:mm a')} PKT
        </div>

        {/* Main Status Card */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>monitor maintenance</span>
              </CardTitle>
              <div className="flex items-center space-x-2">
                {getStatusIcon(overallStatus)}
                <span className="text-sm font-medium text-foreground">
                  {getStatusText(overallStatus)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {statusPageData.sections.map((section) => (
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
          </CardContent>
        </Card>

        {/* Charts Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5" />
                <span>Performance Metrics</span>
              </CardTitle>
              <div className="flex space-x-2">
                {['24h', '7d', '30d'].map((period) => (
                  <Button
                    key={period}
                    variant={selectedPeriod === period ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedPeriod(period as '24h' | '7d' | '30d')}
                  >
                    {period}
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <MonitorCharts 
              data={chartData} 
              monitorName={statusPageData.sections[0]?.monitors[0]?.name || 'Monitor'}
              period={selectedPeriod}
            />
          </CardContent>
        </Card>

        {/* Service Status Sections */}
        <Tabs defaultValue="services" className="space-y-6">
          <TabsList>
            <TabsTrigger value="services">Services</TabsTrigger>
            {statusPageData.maintenances.length > 0 && (
              <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
            )}
            {statusPageData.updates.length > 0 && (
              <TabsTrigger value="updates">Updates</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="services" className="space-y-6">
            {statusPageData.sections.map((section) => (
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
        </Tabs>
      </div>
    </div>
  )
}

export default PublicPage;