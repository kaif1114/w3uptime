"use client";

import { useState } from "react";
import { useCreateMonitor } from "@/hooks/useMonitors";
import {
  useEscalationPolicies,
  useCreateEscalationPolicy,
} from "@/hooks/useEscalationPolicies";
import { CreateMonitorData, MonitorStatus } from "@/types/monitor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, AlertTriangle, Users } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

export interface AddMonitorFormProps {
  onSuccess?: () => void;
}

export function AddMonitorForm({ onSuccess }: AddMonitorFormProps) {
  const createMutation = useCreateMonitor();
  const { data: policiesData } = useEscalationPolicies({ limit: 100 });
  const createPolicyMutation = useCreateEscalationPolicy();

  const [formData, setFormData] = useState<CreateMonitorData>({
    name: "",
    url: "",
    timeout: 30,
    checkInterval: 300,
    expectedStatusCodes: [200],
    status: "ACTIVE",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [statusCodeInput, setStatusCodeInput] = useState("");

  // Escalation policy selection / inline create
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>(
    undefined
  );
  const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyTarget, setNewPolicyTarget] = useState("");
  const [newPolicyMethod, setNewPolicyMethod] = useState<
    "EMAIL" | "SLACK" | "WEBHOOK"
  >("EMAIL");
  const [newPolicyWait, setNewPolicyWait] = useState<number>(0);

  // UI-only options (not yet persisted)
  const [alertWhen] = useState<string>("unavailable");
  const [notifyEmail, setNotifyEmail] = useState<boolean>(true);
  const [notifySms, setNotifySms] = useState<boolean>(false);
  const [notifyPush, setNotifyPush] = useState<boolean>(false);
  const [notifyCritical, setNotifyCritical] = useState<boolean>(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name is optional; we'll derive it from URL if it's not provided

    if (!formData.url.trim()) {
      newErrors.url = "URL is required";
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = "Please enter a valid URL";
      }
    }

    if (!formData.timeout || formData.timeout <= 0)
      newErrors.timeout = "Timeout must be greater than 0";

    if (!formData.checkInterval || formData.checkInterval <= 0)
      newErrors.checkInterval = "Check interval must be greater than 0";

    if (
      !formData.expectedStatusCodes ||
      formData.expectedStatusCodes.length === 0
    )
      newErrors.expectedStatusCodes = "At least one status code is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const derivedName =
        formData.name?.trim() || new URL(formData.url).hostname;
      const payload: CreateMonitorData = { ...formData, name: derivedName };
      if (selectedPolicyId) {
        payload.escalationPolicyId = selectedPolicyId;
      }
      await createMutation.mutateAsync(payload);
      onSuccess?.();
    } catch (error) {
      console.error(error);
    }
  };

  const addStatusCode = () => {
    const code = parseInt(statusCodeInput);
    if (
      code &&
      code >= 100 &&
      code <= 599 &&
      !formData.expectedStatusCodes?.includes(code)
    ) {
      setFormData((prev) => ({
        ...prev,
        expectedStatusCodes: [...(prev.expectedStatusCodes || []), code],
      }));
      setStatusCodeInput("");
    }
  };

  const removeStatusCode = (code: number) => {
    setFormData((prev) => ({
      ...prev,
      expectedStatusCodes:
        prev.expectedStatusCodes?.filter((c) => c !== code) || [],
    }));
  };

  const handleStatusCodeKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addStatusCode();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {createMutation.error && (
        <Alert variant="destructive">
          <AlertDescription>
            {createMutation.error.message ||
              "Failed to create monitor. Please try again."}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6">
        {/* What to monitor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-1 space-y-2">
            <h3 className="text-lg font-semibold">What to monitor</h3>
            <p className="text-sm text-muted-foreground">
              Configure the target website you want to monitor. You can find
              additional configuration in Advanced settings.
            </p>
          </div>
          <Card className="md:col-span-2">
            <CardHeader className="pb-0">
              <CardTitle className="text-base">Alert us when</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="alertWhen">Site becomes</Label>
                <Select value={alertWhen} onValueChange={() => {}}>
                  <SelectTrigger id="alertWhen">
                    <SelectValue placeholder="unavailable" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unavailable">unavailable</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Keyword matching is recommended. Upgrade to enable more
                  options.
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="url">URL to monitor</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://"
                  value={formData.url}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, url: e.target.value }))
                  }
                  aria-invalid={!!errors.url}
                />
                {errors.url && (
                  <p className="text-sm text-destructive">{errors.url}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  You can import multiple monitors later.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Escalation Policies */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-1 space-y-2">
            <h3 className="text-lg font-semibold">Escalation Policies</h3>
            <p className="text-sm text-muted-foreground">
              Select an existing policy or create one.
            </p>
          </div>
          <Card className="md:col-span-2">
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="escalationPolicy">Escalation policy</Label>
                
                {!policiesData?.escalationPolicies || policiesData.escalationPolicies.length === 0 ? (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <h4 className="text-sm font-medium mb-2">No escalation policies yet</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first escalation policy to define how incidents should be handled when they are not acknowledged in time.
                    </p>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreatePolicyOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Policy
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Select
                        value={selectedPolicyId}
                        onValueChange={(v) => setSelectedPolicyId(v)}
                      >
                        <SelectTrigger id="escalationPolicy" className="w-full">
                          <SelectValue placeholder="Select an escalation policy" />
                        </SelectTrigger>
                        <SelectContent>
                          {policiesData?.escalationPolicies?.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Dialog
                        open={isCreatePolicyOpen}
                        onOpenChange={setIsCreatePolicyOpen}
                      >
                        <DialogTrigger asChild>
                          <Button type="button" variant="outline">
                            Create
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Create escalation policy</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-2">
                            <div className="space-y-2">
                              <Label htmlFor="newPolicyName">Name</Label>
                              <Input
                                id="newPolicyName"
                                value={newPolicyName}
                                onChange={(e) => setNewPolicyName(e.target.value)}
                              />
                            </div>
                            <Separator />
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                              <div className="space-y-2">
                                <Label>Method</Label>
                                <Select
                                  value={newPolicyMethod}
                                  onValueChange={(v) =>
                                    setNewPolicyMethod(v as any)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="EMAIL">Email</SelectItem>
                                    <SelectItem value="SLACK">Slack</SelectItem>
                                    <SelectItem value="WEBHOOK">Webhook</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Target</Label>
                                <Input
                                  placeholder="email/channel/url"
                                  value={newPolicyTarget}
                                  onChange={(e) =>
                                    setNewPolicyTarget(e.target.value)
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <Label>Wait (min)</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  value={newPolicyWait}
                                  onChange={(e) =>
                                    setNewPolicyWait(parseInt(e.target.value) || 0)
                                  }
                                />
                              </div>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button
                              type="button"
                              onClick={async () => {
                                if (!newPolicyName || !newPolicyTarget) return;
                                const res = await createPolicyMutation.mutateAsync({
                                  name: newPolicyName,
                                  levels: [
                                    {
                                      method: newPolicyMethod,
                                      target: newPolicyTarget,
                                      waitTimeMinutes: newPolicyWait,
                                    },
                                  ],
                                });
                                setSelectedPolicyId(res.escalationPolicy.id);
                                setIsCreatePolicyOpen(false);
                                setNewPolicyName("");
                                setNewPolicyTarget("");
                                setNewPolicyWait(0);
                              }}
                              disabled={createPolicyMutation.isPending}
                            >
                              {createPolicyMutation.isPending
                                ? "Creating..."
                                : "Create policy"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This policy will be linked to the monitor.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Advanced settings */}
        <details className="group rounded-lg border">
          <summary className="cursor-pointer list-none px-4 py-3 font-medium flex items-center justify-between">
            <span>Advanced settings</span>
            <span className="text-muted-foreground text-sm">(optional)</span>
          </summary>
          <div className="px-4 pb-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: MonitorStatus) =>
                    setFormData((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PAUSED">Paused</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checkInterval">Check Interval (seconds)</Label>
                <Input
                  id="checkInterval"
                  type="number"
                  min={60}
                  value={formData.checkInterval}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      checkInterval: parseInt(e.target.value) || 300,
                    }))
                  }
                  aria-invalid={!!errors.checkInterval}
                />
                {errors.checkInterval && (
                  <p className="text-sm text-destructive">
                    {errors.checkInterval}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (seconds)</Label>
                <Input
                  id="timeout"
                  type="number"
                  min={1}
                  max={120}
                  value={formData.timeout}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      timeout: parseInt(e.target.value) || 30,
                    }))
                  }
                  aria-invalid={!!errors.timeout}
                />
                {errors.timeout && (
                  <p className="text-sm text-destructive">{errors.timeout}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Expected Status Codes</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    min={100}
                    max={599}
                    placeholder="200"
                    value={statusCodeInput}
                    onChange={(e) => setStatusCodeInput(e.target.value)}
                    onKeyPress={handleStatusCodeKeyPress}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addStatusCode}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {errors.expectedStatusCodes && (
                  <p className="text-sm text-destructive">
                    {errors.expectedStatusCodes}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.expectedStatusCodes?.map((code) => (
                    <div
                      key={code}
                      className="flex items-center gap-1 bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm"
                    >
                      {code}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0"
                        onClick={() => removeStatusCode(code)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </details>

        {/* Metadata */}
        <details className="group rounded-lg border">
          <summary className="cursor-pointer list-none px-4 py-3 font-medium">
            Metadata
          </summary>
          <div className="px-4 pb-4 text-sm text-muted-foreground">
            Add custom metadata to enhance your monitor context (coming soon).
          </div>
        </details>
      </div>

      {/* Primary Actions */}
      <div className="flex justify-end">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create monitor"}
        </Button>
      </div>
    </form>
  );
}

export default AddMonitorForm;
