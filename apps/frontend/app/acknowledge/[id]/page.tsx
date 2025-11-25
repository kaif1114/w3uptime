import { prisma } from "db/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { stopEscalation } from "@/lib/escalation";
import { format } from "date-fns";

interface AcknowledgePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ via?: string; contact?: string }>;
}

interface EscalationData {
  id: string;
  alertId: string;
  escalationLevelId: string;
  acknowledgedAt: Date | null;
  acknowledgedBy: string | null;
  Alert: {
    id: string;
    title: string;
    message: string;
    triggeredAt: Date;
    monitor: {
      id: string;
      name: string;
      url: string;
      userId: string;
    };
  };
  escalationLevel: {
    levelOrder: number;
    channel: string;
  };
}

export default async function AcknowledgePage({ 
  params, 
  searchParams 
}: AcknowledgePageProps) {
  const { id: escalationLogId } = await params;
  const { via, contact } = await searchParams;
  
  let status: 'success' | 'error' | 'already_acknowledged' = 'error';
  let message = '';
  let escalationData: EscalationData | null = null;

  try {
    
    escalationData = await prisma.escalationLog.findUnique({
      where: { id: escalationLogId },
      include: {
        Alert: {
          include: {
            monitor: {
              select: {
                id: true,
                name: true,
                url: true,
                userId: true
              }
            }
          }
        },
        escalationLevel: {
          select: {
            levelOrder: true,
            channel: true
          }
        }
      }
    });

    if (!escalationData) {
      status = 'error';
      message = 'Escalation record not found';
    } else if (escalationData.acknowledgedAt) {
      status = 'already_acknowledged';
      message = 'This alert has already been acknowledged';
      if (escalationData.acknowledgedAt) {
        message += ` on ${format(escalationData.acknowledgedAt, 'MMM d, yyyy \'at\' h:mm a')}`;
      }
      if (escalationData.acknowledgedBy) {
        message += ` by ${escalationData.acknowledgedBy}`;
      }
    } else {
      
      const incident = await prisma.incident.findFirst({
        where: {
          monitorId: escalationData.Alert.monitor.id,
          status: { in: ['ONGOING', 'ACKNOWLEDGED'] }
        },
        orderBy: { createdAt: 'desc' }
      });

      
      await prisma.$transaction(async (tx) => {
        
        await tx.escalationLog.update({
          where: { id: escalationLogId },
          data: {
            wasAcknowledged: true,
            acknowledgedAt: new Date(),
            acknowledgedBy: contact || 'Unknown',
            acknowledgedVia: via === 'email' ? 'EMAIL' : via === 'slack' ? 'SLACK' : 'EMAIL'
          }
        });

        
        if (incident && incident.status === 'ONGOING') {
          await tx.incident.update({
            where: { id: incident.id },
            data: { status: 'ACKNOWLEDGED' }
          });

          
          const acknowledgedBy = contact || 'Unknown';
          const viaText = via === 'email' ? 'email' : via === 'slack' ? 'Slack' : 'web';
          
          await tx.timelineEvent.create({
            data: {
              description: `Incident acknowledged via ${viaText} by ${acknowledgedBy}`,
              incidentId: incident.id,
              type: 'INCIDENT',
            }
          });

          
          if (escalationData) {
            try {
              await stopEscalation(escalationData.Alert.monitor.id, incident.id);
            } catch (escalationError) {
              console.error(`Failed to stop escalation:`, escalationError);
            }
          }
        }
      });

      status = 'success';
      message = 'Alert has been successfully acknowledged';
    }
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    status = 'error';
    message = 'An error occurred while acknowledging the alert';
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'already_acknowledged':
        return <AlertTriangle className="h-12 w-12 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-12 w-12 text-red-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-700';
      case 'already_acknowledged':
        return 'text-yellow-700';
      case 'error':
        return 'text-red-700';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className={`text-xl ${getStatusColor()}`}>
            {status === 'success' && 'Acknowledgment Successful'}
            {status === 'already_acknowledged' && 'Already Acknowledged'}
            {status === 'error' && 'Acknowledgment Failed'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-gray-600">
            {message}
          </p>
          
          {escalationData && (
            <div className="space-y-2 p-4 bg-gray-100 rounded-lg">
              <div>
                <span className="font-medium">Monitor:</span>
                <span className="ml-2">{escalationData.Alert.monitor.name}</span>
              </div>
              <div>
                <span className="font-medium">URL:</span>
                <span className="ml-2 text-sm break-all">{escalationData.Alert.monitor.url}</span>
              </div>
              <div>
                <span className="font-medium">Alert:</span>
                <span className="ml-2">{escalationData.Alert.title}</span>
              </div>
              <div>
                <span className="font-medium">Escalation Level:</span>
                <span className="ml-2">Level {escalationData.escalationLevel.levelOrder} ({escalationData.escalationLevel.channel})</span>
              </div>
              {status === 'success' && (
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                    ACKNOWLEDGED
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col space-y-2">
            <Button asChild className="w-full">
              <a href={process.env.NEXT_PUBLIC_URL || 'https://app.w3uptime.com'}>
                Go to Dashboard
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}