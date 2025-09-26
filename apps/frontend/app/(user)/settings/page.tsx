import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and integrations.</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Slack Integration</CardTitle>
            <CardDescription>
              Connect your Slack workspace to receive notifications about incidents and monitor status updates.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a href="https://slack.com/oauth/v2/authorize?client_id=9604180472545.9587048237669&scope=incoming-webhook,chat:write&user_scope=">
              <img 
                alt="Add to Slack" 
                height="40" 
                width="139" 
                src="https://platform.slack-edge.com/img/add_to_slack.png" 
                srcSet="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" 
              />
            </a>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Settings</CardTitle>
            <CardDescription>
              Manage your account preferences and personal information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Account settings coming soon...</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Preferences</CardTitle>
            <CardDescription>
              Configure how and when you want to receive notifications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Notification preferences coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}