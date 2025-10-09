'use client';

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Activity,
  Calendar,
  Timer
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';

interface UptimeRecord {
  timestamp: Date;
  status: 'up' | 'down';
  latency?: number;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime?: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedRegions: string[];
  status: 'ongoing' | 'resolved';
}

interface UptimeIncidentPanelProps {
  uptimeData: UptimeRecord[];
  incidents: Incident[];
  monitorName?: string;
}

export function UptimeIncidentPanel({ uptimeData, incidents, monitorName }: UptimeIncidentPanelProps) {
  const uptimeStats = useMemo(() => {
    if (uptimeData.length === 0) return null;

    const now = new Date();
    const last24h = uptimeData.filter(record => 
      now.getTime() - record.timestamp.getTime() <= 24 * 60 * 60 * 1000
    );
    const last7d = uptimeData.filter(record => 
      now.getTime() - record.timestamp.getTime() <= 7 * 24 * 60 * 60 * 1000
    );
    const last30d = uptimeData.filter(record => 
      now.getTime() - record.timestamp.getTime() <= 30 * 24 * 60 * 60 * 1000
    );

    const calculateUptime = (data: UptimeRecord[]) => {
      if (data.length === 0) return 100;
      const upCount = data.filter(record => record.status === 'up').length;
      return Math.round((upCount / data.length) * 100 * 100) / 100; 
    };

    
    let currentStreak = 0;
    const sortedData = [...uptimeData].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    for (const record of sortedData) {
      if (record.status === 'up') {
        currentStreak++;
      } else {
        break;
      }
    }

    
    const lastDowntime = sortedData.find(record => record.status === 'down');
    const uptimeStart = lastDowntime ? lastDowntime.timestamp : sortedData[sortedData.length - 1]?.timestamp || now;
    
    return {
      uptime24h: calculateUptime(last24h),
      uptime7d: calculateUptime(last7d),
      uptime30d: calculateUptime(last30d),
      currentStreak,
      uptimeDuration: formatDistanceToNow(uptimeStart, { addSuffix: false }),
      isCurrentlyUp: sortedData[0]?.status === 'up'
    };
  }, [uptimeData]);

  const recentIncidents = useMemo(() => {
    return incidents
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
      .slice(0, 5);
  }, [incidents]);

  const ongoingIncidents = useMemo(() => {
    return incidents.filter(incident => incident.status === 'ongoing');
  }, [incidents]);


  const getSeverityVariant = (severity: string) => {
    switch (severity) {
      case 'low': return 'outline';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  if (!uptimeStats) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <p className="text-muted-foreground">No uptime data available</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {ongoingIncidents.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{ongoingIncidents.length} ongoing incident{ongoingIncidents.length > 1 ? 's' : ''}</strong>
            {ongoingIncidents.map(incident => (
              <div key={incident.id} className="mt-1">
                {incident.title} - Started {formatDistanceToNow(incident.startTime, { addSuffix: true })}
              </div>
            ))}
          </AlertDescription>
        </Alert>
      )}

      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            {uptimeStats.isCurrentlyUp ? (
              <CheckCircle className="h-8 w-8 text-green-500" />
            ) : (
              <XCircle className="h-8 w-8 text-red-500" />
            )}
            <div>
              <h3 className="text-xl font-semibold">
                {uptimeStats.isCurrentlyUp ? 'Operational' : 'Down'}
              </h3>
              <p className="text-muted-foreground">
                {uptimeStats.isCurrentlyUp 
                  ? `Up for ${uptimeStats.uptimeDuration}` 
                  : 'Service is currently experiencing issues'
                }
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">24 Hours</span>
              </div>
              <div className="text-2xl font-bold mb-1">{uptimeStats.uptime24h}%</div>
              <Progress value={uptimeStats.uptime24h} className="h-2" />
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">7 Days</span>
              </div>
              <div className="text-2xl font-bold mb-1">{uptimeStats.uptime7d}%</div>
              <Progress value={uptimeStats.uptime7d} className="h-2" />
            </div>

            <div className="text-center p-4 border rounded-lg">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Timer className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">30 Days</span>
              </div>
              <div className="text-2xl font-bold mb-1">{uptimeStats.uptime30d}%</div>
              <Progress value={uptimeStats.uptime30d} className="h-2" />
            </div>
          </div>
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Recent Incidents
            </span>
            <Badge variant="outline">
              {incidents.length} Total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentIncidents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
              <p>No incidents in the past 30 days</p>
              <p className="text-sm">All systems operational</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentIncidents.map((incident) => (
                <div key={incident.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-semibold">{incident.title}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {incident.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Badge variant={getSeverityVariant(incident.severity)}>
                        {incident.severity}
                      </Badge>
                      <Badge variant={incident.status === 'ongoing' ? 'destructive' : 'default'}>
                        {incident.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      Started: {format(incident.startTime, 'MMM dd, HH:mm')}
                    </span>
                    {incident.endTime && (
                      <>
                        <span>•</span>
                        <span>
                          Duration: {differenceInMinutes(incident.endTime, incident.startTime)} minutes
                        </span>
                      </>
                    )}
                    {incident.affectedRegions.length > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          Affected: {incident.affectedRegions.join(', ')}
                        </span>
                      </>
                    )}
                  </div>

                  {incident.status === 'ongoing' && (
                    <div className="mt-2 text-sm text-red-600">
                      Ongoing for {formatDistanceToNow(incident.startTime)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            SLA Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Availability Target</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm">99.9% SLA</span>
                  <span className={`text-sm font-medium ${uptimeStats.uptime30d >= 99.9 ? 'text-green-600' : 'text-red-600'}`}>
                    {uptimeStats.uptime30d >= 99.9 ? 'Met' : 'Not Met'}
                  </span>
                </div>
                <Progress 
                  value={Math.min(uptimeStats.uptime30d / 99.9 * 100, 100)} 
                  className="h-2" 
                />
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-2">Incident Response</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Avg Resolution Time</span>
                  <span className="font-medium">15 minutes</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Incidents (30d)</span>
                  <span className="font-medium">{incidents.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>MTTR</span>
                  <span className="font-medium">12 minutes</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}