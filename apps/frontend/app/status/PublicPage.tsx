'use client'
import React, { useState } from 'react'
import Navbar from './Navbar'
import { notFound } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MonitorCharts } from './Chart'
import { StatusOverview } from './StatusOverview'
import { ServicesSection } from './ServicesSection'

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
          status: 'up' as const,
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

const PublicPage = ({params}: {params: {service: string}}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  
  // For demo purposes, use sample data
  const statusPageData = sampleStatusPageData;
  const chartData = generateSampleChartData();

  if (!statusPageData) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        logoUrl={statusPageData.logoUrl}
        companyName={statusPageData.name}
        logoLinkUrl={statusPageData.logoLinkUrl}
        currentPage="status"
        serviceId={params.service}
      />
      
      <div className="container mx-auto px-4 py-8">
        {/* Status Overview Component */}
        <StatusOverview sections={statusPageData.sections} />

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

        {/* Services Section Component */}
        <ServicesSection 
          sections={statusPageData.sections}
          maintenances={statusPageData.maintenances}
          updates={statusPageData.updates}
        />
      </div>
    </div>
  )
}

export default PublicPage;