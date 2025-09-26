import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SlackIntegrationCard from "@/components/settings/slack-integration-card";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and integrations.</p>
      </div>

      <div className="grid gap-6">
        <SlackIntegrationCard />

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