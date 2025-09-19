'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, Check, ExternalLink, MessageSquare, Settings, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  purpose: string;
  memberCount: number;
}

interface SlackIntegration {
  id: string;
  teamId: string;
  teamName: string;
  scope: string;
  createdAt: string;
  channels: SlackChannel[];
  error?: string;
}

export default function IntegrationsPage() {
  const [slackIntegrations, setSlackIntegrations] = useState<SlackIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    fetchSlackIntegrations();
    
    // Check for URL parameters (success/error messages)
    const urlParams = new URLSearchParams(window.location.search);
    const success = urlParams.get('success');
    const error = urlParams.get('error');
    const team = urlParams.get('team');

    if (success === 'slack_connected' && team) {
      toast.success(`Successfully connected to ${decodeURIComponent(team)}`);
      // Clean up URL
      window.history.replaceState({}, '', '/settings/integrations');
      // Refresh integrations
      setTimeout(() => fetchSlackIntegrations(), 1000);
    } else if (error) {
      toast.error(`Failed to connect Slack: ${error.replace('slack_', '').replace('_', ' ')}`);
      // Clean up URL
      window.history.replaceState({}, '', '/settings/integrations');
    }
  }, []);

  const fetchSlackIntegrations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations/slack/channels', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setSlackIntegrations(data.integrations || []);
      } else {
        console.error('Failed to fetch Slack integrations');
      }
    } catch (error) {
      console.error('Error fetching Slack integrations:', error);
    } finally {
      setLoading(false);
    }
  };

  const connectSlack = async () => {
    try {
      setConnecting(true);
      const response = await fetch('/api/integrations/slack/auth', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.authUrl) {
          // Redirect to Slack OAuth
          window.location.href = data.authUrl;
        } else {
          throw new Error(data.error || 'Failed to get Slack auth URL');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.details || errorData.error || 'Failed to initiate Slack connection';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error connecting to Slack:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to Slack. Please try again.';
      toast.error(errorMessage);
    } finally {
      setConnecting(false);
    }
  };

  const disconnectSlack = async (integrationId: string, teamName: string) => {
    try {
      const response = await fetch('/api/integrations/slack/disconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ integrationId }),
      });

      if (response.ok) {
        toast.success(`Successfully disconnected from ${teamName}`);
        fetchSlackIntegrations();
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting Slack:', error);
      toast.error('Failed to disconnect Slack integration.');
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Integrations</h1>
        <p className="text-muted-foreground">
          Connect external services to receive alerts and notifications.
        </p>
      </div>

      <Separator />

      {/* Slack Integration Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Slack
                {slackIntegrations.length > 0 && (
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <Check className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Send alert notifications to your Slack channels
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : slackIntegrations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Slack Workspaces Connected</h3>
              <p className="text-gray-500 mb-4">
                Connect your Slack workspace to receive monitor alerts in your channels.
              </p>
              <Button onClick={connectSlack} disabled={connecting}>
                {connecting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Connecting...
                  </>
                ) : (
                  <>
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Connect Slack
                  </>
                )}
              </Button>
              
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg text-left">
                <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                  If you see "Slack integration not configured" errors, you need to set up environment variables:
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-2">
                  See <code>docs/SLACK_INTEGRATION_SETUP.md</code> for detailed setup instructions.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {slackIntegrations.map((integration) => (
                <div key={integration.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-lg">{integration.teamName}</h3>
                      <p className="text-sm text-gray-500">
                        Connected on {new Date(integration.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => disconnectSlack(integration.id, integration.teamName)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Disconnect
                    </Button>
                  </div>

                  {integration.error && (
                    <Alert className="mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{integration.error}</AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <h4 className="font-medium mb-2">Available Channels ({integration.channels.length})</h4>
                    {integration.channels.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        No accessible channels found. Make sure to invite the W3Uptime bot to your desired channels.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {integration.channels.map((channel) => (
                          <div
                            key={channel.id}
                            className="flex items-center gap-2 p-2 bg-gray-50 rounded border"
                          >
                            <span className="text-gray-500">#</span>
                            <span className="font-mono text-sm">{channel.name}</span>
                            {channel.isPrivate && (
                              <Badge variant="secondary" className="text-xs">Private</Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="flex justify-center pt-4">
                <Button variant="outline" onClick={connectSlack} disabled={connecting}>
                  {connecting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                      Connecting...
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Connect Another Workspace
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <Alert>
            <Settings className="h-4 w-4" />
            <AlertDescription>
              <strong>Setup Instructions:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Click "Connect Slack" to authorize W3Uptime</li>
                <li>Invite the W3Uptime bot to your desired channels</li>
                <li>Use channel names in your escalation policies</li>
              </ol>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
