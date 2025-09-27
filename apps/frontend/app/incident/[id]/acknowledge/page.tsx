import { prisma } from "db/client";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { stopEscalation } from "@/lib/escalation";
import { format } from "date-fns";

interface AcknowledgePageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ via?: string; contact?: string }>;
}

export default async function AcknowledgePage({ 
  params, 
  searchParams 
}: AcknowledgePageProps) {
  const { id: incidentId } = await params;
  const { via, contact } = await searchParams;
  
  let status: 'success' | 'error' | 'already_acknowledged' = 'error';
  let message = '';
  let incident: any = null;

  try {
    // First, fetch the incident to validate it exists
    incident = await prisma.incident.findUnique({
      where: { id: incidentId },
      include: {
        Monitor: {
          select: {
            id: true,
            name: true,
            url: true,
            userId: true,
            escalationPolicy: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    if (!incident) {
      status = 'error';
      message = 'Incident not found';
    } else if (incident.status === 'ACKNOWLEDGED') {
      status = 'already_acknowledged';
      message = 'This incident has already been acknowledged';
    } else if (incident.status === 'RESOLVED') {
      status = 'already_acknowledged';
      message = 'This incident has already been resolved';
    } else {
      // Acknowledge the incident
      await prisma.$transaction(async (tx) => {
        // Update incident status
        await tx.incident.update({
          where: { id: incidentId },
          data: {
            status: 'ACKNOWLEDGED',
          }
        });

        // Create timeline event
        const acknowledgedBy = contact || 'Unknown';
        const viaText = via === 'email' ? 'email' : via === 'slack' ? 'Slack' : 'web';
        
        await tx.timelineEvent.create({
          data: {
            description: `Incident acknowledged via ${viaText} by ${acknowledgedBy}`,
            incidentId: incidentId,
            type: 'INCIDENT',
          }
        });

        // If we have escalation log info, update it
        if (via && contact) {
          // Find the escalation log for this incident and update acknowledgment details
          const alert = await tx.alert.findFirst({
            where: { monitorId: incident.Monitor.id },
            include: { EscalationLog: true }
          });

          if (alert && alert.EscalationLog) {
            for (const log of alert.EscalationLog) {
              await tx.escalationLog.update({
                where: { id: log.id },
                data: {
                  wasAcknowledged: true,
                  acknowledgedAt: new Date(),
                  acknowledgedBy: contact,
                  acknowledgedVia: via === 'email' ? 'EMAIL' : via === 'slack' ? 'SLACK' : 'EMAIL'
                }
              });
            }
          }
        }
      });

      // Stop any pending escalations
      try {
        await stopEscalation(incident.Monitor.id, incidentId);
        console.log(`Escalation stopped for incident ${incidentId} via acknowledge page`);
      } catch (escalationError) {
        console.error(`Failed to stop escalation for incident ${incidentId}:`, escalationError);
      }

      status = 'success';
      message = 'Incident has been successfully acknowledged';
    }
  } catch (error) {
    console.error('Error acknowledging incident:', error);
    status = 'error';
    message = 'An error occurred while acknowledging the incident';
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
          
          {incident && (
            <div className="space-y-2 p-4 bg-gray-100 rounded-lg">
              <div>
                <span className="font-medium">Monitor:</span>
                <span className="ml-2">{incident.Monitor.name}</span>
              </div>
              <div>
                <span className="font-medium">URL:</span>
                <span className="ml-2 text-sm break-all">{incident.Monitor.url}</span>
              </div>
              <div>
                <span className="font-medium">Incident:</span>
                <span className="ml-2">{incident.title}</span>
              </div>
              <div>
                <span className="font-medium">Created:</span>
                <span className="ml-2">{format(new Date(incident.createdAt), 'MMM d, yyyy \'at\' h:mm a')}</span>
              </div>
              {status === 'success' && (
                <div>
                  <span className="font-medium">Status:</span>
                  <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                    ACKNOWLEDGED
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col space-y-2">
            {incident && (
              <Button
                onClick={() => window.location.href = `${process.env.NEXT_PUBLIC_APP_URL || 'https://app.w3uptime.com'}/incidents/${incidentId}`}
                className="w-full"
              >
                View Incident Details
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => window.location.href = process.env.NEXT_PUBLIC_APP_URL || 'https://app.w3uptime.com'}
              className="w-full"
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}