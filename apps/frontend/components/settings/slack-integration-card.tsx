"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSlackIntegrations, useDeleteSlackIntegration } from "@/hooks/useSlackIntegration";
import { Trash2, ExternalLink, Slack, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function SlackIntegrationCard() {
  const { data, isLoading, error } = useSlackIntegrations();
  const deleteIntegration = useDeleteSlackIntegration();

  const handleDelete = async (integrationId: string, teamName: string) => {
    try {
      await deleteIntegration.mutateAsync(integrationId);
      toast.success(`Disconnected from ${teamName}`);
    } catch (error) {
      toast.error("Failed to disconnect Slack integration");
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Slack Integration</CardTitle>
          <CardDescription>
            There was an error loading your Slack integrations.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Slack className="h-5 w-5" />
          Slack Integration
        </CardTitle>
        <CardDescription>
          Connect your Slack workspace to receive notifications about incidents and monitor status updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : data?.integrations && data.integrations.length > 0 ? (
          <div className="space-y-4">
            <div className="space-y-3">
              {data.integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-slack-green">
                      <Slack className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{integration.teamName}</p>
                      <p className="text-sm text-muted-foreground">
                        Connected {new Date(integration.createdAt).toLocaleDateString()}
                      </p>
                      {integration.defaultChannelName && (
                        <p className="text-xs text-muted-foreground">
                          Default channel: #{integration.defaultChannelName}
                        </p>
                      )}
                      {integration.webhookUrl && (
                        <p className="text-xs text-green-600">
                          ✓ Webhook configured for escalations
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      Active
                    </Badge>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={deleteIntegration.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disconnect Slack Integration</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to disconnect from {integration.teamName}? 
                            You will no longer receive notifications in this Slack workspace.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(integration.id, integration.teamName)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Disconnect
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
            <div className="pt-2 border-t">
              <a 
                href="https://slack.com/oauth/v2/authorize?client_id=9604180472545.9587048237669&scope=incoming-webhook,chat:write,channels:read&user_scope="
                className="inline-block"
              >
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Connect Another Workspace
                </Button>
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <Slack className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              No Slack workspaces connected yet.
            </p>
            <a href={`https://slack.com/oauth/v2/authorize?client_id=${process.env.NEXT_PUBLIC_SLACK_CLIENT_ID}&scope=incoming-webhook,chat:write,channels:read&user_scope=`}>
              <img 
                alt="Add to Slack" 
                height="40" 
                width="139" 
                src="https://platform.slack-edge.com/img/add_to_slack.png" 
                srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" 
              />
            </a>
          </div>
        )}
      </CardContent>
    </Card>
  );
}