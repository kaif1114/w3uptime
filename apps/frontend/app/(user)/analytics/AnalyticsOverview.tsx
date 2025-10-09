'use client';

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMonitor, useMonitorAnalytics } from "@/hooks/useMonitors";
import { useAvailableCountries } from "@/hooks/useAnalytics";
import { AlertTriangle, CheckCircle, TrendingUp, MapPin, BarChart3, Lightbulb, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CountryRankingTable } from "@/components/analytics/CountryRankingTable";
import { EnhancedTimePeriod, CustomTimePeriod } from "@/types/analytics";
import { RegionalLatencyChart } from "@/components/analytics/RegionalLatencyChart";
import { PerformanceInsightsCard } from "@/components/analytics/PerformanceInsightsCard";
import { HourlyPatternsChart } from "@/components/analytics/HourlyPatternsChart";
import { WeeklyComparisonTable } from "@/components/analytics/WeeklyComparisonTable";

interface AnalyticsOverviewProps {
  monitorId: string;
  period: EnhancedTimePeriod | string;
  customPeriod?: CustomTimePeriod;
}

export function AnalyticsOverview({ monitorId, period, customPeriod }: AnalyticsOverviewProps) {
  const { data: analytics, isLoading, error } = useMonitorAnalytics(monitorId, period);
  const { data: monitor } = useMonitor(monitorId);
  const { data: availableCountries } = useAvailableCountries(monitorId);
  
  const [activeTab, setActiveTab] = useState('overview');
  const [isExporting, setIsExporting] = useState(false);
  
  const exportToPDF = async () => {
    setIsExporting(true);
    
    const originalActiveTab = activeTab;
    try {
      
      
      const html2canvas = (await import('html2canvas-pro')).default;
      const jsPDF = (await import('jspdf')).default;
      
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      
      
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Website Analytics Report', margin, 20);
      
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      let headerY = 32;
      if (monitor) {
        pdf.text(`Monitor: ${monitor.name}`, margin, headerY); headerY += 7;
        pdf.text(`URL: ${monitor.url}`, margin, headerY); headerY += 7;
        pdf.text(`Status: ${monitor.status}   Interval: ${monitor.checkInterval}s   Timeout: ${monitor.timeout}s`, margin, headerY); headerY += 7;
      }
      pdf.text(`Monitor ID: ${monitorId}`, margin, headerY); headerY += 7;
      pdf.text(`Period: ${typeof period === 'string' ? period : 'Custom'}`, margin, headerY); headerY += 7;
      pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, headerY); headerY += 7;
      
      
      if (analytics) {
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Performance Summary:', margin, headerY + 12);
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        let summaryY = headerY + 20;
        
        if (analytics.uptime) {
          pdf.text(`• Uptime: ${Number(analytics.uptime.uptime_percentage || 0).toFixed(2)}%`, margin + 5, summaryY);
          summaryY += 6;
          pdf.text(`• Total Checks: ${analytics.uptime.total_checks || 0}`, margin + 5, summaryY);
          summaryY += 6;
          pdf.text(`• Successful: ${analytics.uptime.successful_checks || 0}, Failed: ${analytics.uptime.failed_checks || 0}`, margin + 5, summaryY);
          summaryY += 6;
        }
        
        if (analytics.bestRegion) {
          pdf.text(`• Best Region: ${analytics.bestRegion.region_name} (${Number(analytics.bestRegion.avg_latency || 0).toFixed(0)}ms)`, margin + 5, summaryY);
          summaryY += 6;
        }
        
        if (analytics.worstRegion) {
          pdf.text(`• Worst Region: ${analytics.worstRegion.region_name} (${Number(analytics.worstRegion.avg_latency || 0).toFixed(0)}ms)`, margin + 5, summaryY);
          summaryY += 6;
        }
        
        if (analytics.healthScore) {
          pdf.text(`• Health Grade: ${analytics.healthScore.grade} (${analytics.healthScore.score}/100)`, margin + 5, summaryY);
          summaryY += 6;
        }
        
        summaryY = summaryY + 8;
      }
      
      
      pdf.addPage();
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Overview', margin, 20);
      
      
      setActiveTab('overview');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      
      const overviewElement = document.querySelector('[data-tab="overview"]');
      if (overviewElement) {
        const canvas = await html2canvas(overviewElement as HTMLElement, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          removeContainer: true
        });
        
        const imgData = canvas.toDataURL('image/png', 0.95);
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const xCentered = (pageWidth - imgWidth) / 2;
        
        
        let remainingHeight = imgHeight;
        let sourceY = 0;
        let currentY = 30;
        
        while (remainingHeight > 0) {
          const availableHeight = pageHeight - currentY - margin;
          const sliceHeight = Math.min(remainingHeight, availableHeight);
          const sliceRatio = sliceHeight / imgHeight;
          const canvasSliceHeight = canvas.height * sliceRatio;
          
          pdf.addImage(imgData, 'PNG', xCentered, currentY, imgWidth, sliceHeight, undefined, 'FAST');
          
          remainingHeight -= sliceHeight;
          sourceY += canvasSliceHeight;
          
          if (remainingHeight > 0) {
            pdf.addPage();
            currentY = margin;
          }
        }
      }
      
      
      if (analytics && analytics.performanceInsights && analytics.performanceInsights.length > 0) {
        
        setActiveTab('insights');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const insightsElement = document.querySelector('[data-tab="insights"]');
        if (insightsElement) {
          pdf.addPage();
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Performance Insights', margin, 20);
        
        const canvas = await html2canvas(insightsElement as HTMLElement, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          removeContainer: true
        });
        
        const imgData = canvas.toDataURL('image/png', 0.95);
        const maxWidth = pageWidth - 2 * margin;
        const maxHeight = pageHeight - 30 - margin;
        let displayWidth = maxWidth;
        let displayHeight = (canvas.height * displayWidth) / canvas.width;
        if (displayHeight > maxHeight) {
          const scale = maxHeight / displayHeight;
          displayWidth = displayWidth * scale;
          displayHeight = displayHeight * scale;
        }
        const xCenteredInsights = (pageWidth - displayWidth) / 2;
        pdf.addImage(imgData, 'PNG', xCenteredInsights, 30, displayWidth, displayHeight, undefined, 'FAST');
      }
      }
      
      
      if (availableCountries && availableCountries.countries.length > 0) {
        
        setActiveTab('rankings');
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const rankingsElement = document.querySelector('[data-tab="rankings"]');
        if (rankingsElement) {
          pdf.addPage();
          pdf.setFontSize(18);
          pdf.setFont('helvetica', 'bold');
          pdf.text('Country Performance Rankings', margin, 20);
        
        const canvas = await html2canvas(rankingsElement as HTMLElement, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          removeContainer: true
        });
        
        const imgData = canvas.toDataURL('image/png', 0.95);
        const imgWidth = pageWidth - 2 * margin;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const xCenteredRankings = (pageWidth - imgWidth) / 2;
        
        
        let remainingHeight = imgHeight;
        let currentY = 30;
        
        while (remainingHeight > 0) {
          const availableHeight = pageHeight - currentY - margin;
          const sliceHeight = Math.min(remainingHeight, availableHeight);
          
          pdf.addImage(imgData, 'PNG', xCenteredRankings, currentY, imgWidth, sliceHeight, undefined, 'FAST');
          
          remainingHeight -= sliceHeight;
          
          if (remainingHeight > 0) {
            pdf.addPage();
            currentY = margin;
          }
        }
      }
      }
      
      
      setActiveTab(originalActiveTab);
      
      
      const fileSlug = monitor ? (monitor.name || monitor.url || monitorId).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') : monitorId;
      pdf.save(`analytics-report-${fileSlug}-${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('Error exporting PDF:', error);
      alert('Failed to export PDF. Please try again.');
      
      setActiveTab(originalActiveTab);
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-12 bg-muted rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse space-y-4">
                  <div className="h-4 bg-muted rounded w-2/3"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="mx-auto h-8 w-8 text-destructive mb-2" />
          <p className="text-destructive">Failed to load analytics data</p>
        </CardContent>
      </Card>
    );
  }

  if (!analytics) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">No analytics data available</p>
        </CardContent>
      </Card>
    );
  }

  const { uptime, bestRegion, worstRegion, regional } = analytics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights
            </TabsTrigger>
            <TabsTrigger value="rankings" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Rankings
            </TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Button 
          onClick={exportToPDF}
          disabled={isExporting || !analytics}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? 'Exporting...' : 'Export Report'}
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>

        
        <TabsContent value="overview" className="space-y-6" data-tab="overview">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {uptime?.uptime_percentage ? Number(uptime.uptime_percentage).toFixed(2) : '0'}%
              </div>
              <div className="space-y-2 mt-4">
                <Progress 
                  value={uptime?.uptime_percentage ? Number(uptime.uptime_percentage) : 0} 
                  className="w-full" 
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{uptime?.successful_checks || 0} successful</span>
                  <span>{uptime?.failed_checks || 0} failed</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Total checks: {uptime?.total_checks || 0}
              </p>
            </CardContent>
          </Card>

          
          {worstRegion && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Worst Region</CardTitle>
                <MapPin className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {worstRegion.avg_latency ? Number(worstRegion.avg_latency).toFixed(0) : '0'}ms
                </div>
                <div className="mt-2">
                  <Badge variant="destructive">
                    {worstRegion.region_name}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {worstRegion.region_type} • {worstRegion.sample_count} samples
                </p>
              </CardContent>
            </Card>
          )}

          
          {bestRegion && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Best Region</CardTitle>
                <MapPin className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {bestRegion.avg_latency ? Number(bestRegion.avg_latency).toFixed(0) : '0'}ms
                </div>
                <div className="mt-2">
                  <Badge variant="secondary">
                    {bestRegion.region_name}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {bestRegion.region_type} • {bestRegion.sample_count} samples
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        
        <RegionalLatencyChart 
          monitorId={monitorId} 
          period={typeof period === 'string' ? period : 'day'} 
          customPeriod={customPeriod ? { startDate: customPeriod.startDate, endDate: customPeriod.endDate } : undefined}
        />

        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performing Countries</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {regional.byCountry.slice(0, 8).map((country, index) => (
                <div key={country.country_code} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="w-8 justify-center">
                      {index + 1}
                    </Badge>
                    <span className="font-medium">{country.country_code}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {country.avg_latency ? Number(country.avg_latency).toFixed(0) : '0'}ms
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {country.sample_count || 0} checks
                    </div>
                  </div>
                </div>
              ))}
              {regional.byCountry.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No regional data available
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

        
        <TabsContent value="insights" className="space-y-6" data-tab="insights">
        
        {analytics.performanceInsights && analytics.healthScore && (
          <div className="w-full">
            <PerformanceInsightsCard 
              insights={analytics.performanceInsights}
              healthScore={analytics.healthScore}
            />
          </div>
        )}

        
        <div className="">
          
          {analytics.weeklyComparison && analytics.weeklyComparison.length > 0 && (
            <div className="w-full mb-6">
              <WeeklyComparisonTable comparisons={analytics.weeklyComparison} />
            </div>
          )}

          
          {analytics.hourlyPatterns && analytics.hourlyPatterns.length > 0 && (
            <div className="w-full">
              <HourlyPatternsChart 
                patterns={analytics.hourlyPatterns}
                period={typeof period === 'string' ? period : 'day'}
              />
            </div>
          )}
        </div>

        
        {(!analytics.performanceInsights || analytics.performanceInsights.length === 0) && 
         (!analytics.weeklyComparison || analytics.weeklyComparison.length === 0) && 
         (!analytics.hourlyPatterns || analytics.hourlyPatterns.length === 0) && (
          <Card>
            <CardContent className="p-6 text-center">
              <Lightbulb className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-muted-foreground">Enhanced insights will appear as more data is collected</p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

        
        <TabsContent value="rankings" className="space-y-6" data-tab="rankings">
        {availableCountries && availableCountries.countries.length > 0 && (
          <CountryRankingTable
            countries={availableCountries.countries}
            title="Global Country Performance Rankings"
          />
        )}
        </TabsContent>
      </Tabs>
    </div>
  );
}