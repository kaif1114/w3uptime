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

      </div>
    </div>
  );
}