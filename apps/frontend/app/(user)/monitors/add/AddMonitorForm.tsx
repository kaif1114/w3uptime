"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  useCreateEscalationPolicy,
  useEscalationPolicies,
} from "@/hooks/useEscalationPolicies";
import { useCreateMonitor } from "@/hooks/useMonitors";
import { CreateMonitorData, MonitorStatus } from "@/types/monitor";
import { Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";

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

  
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | undefined>(
    undefined
  );
  const [isCreatePolicyOpen, setIsCreatePolicyOpen] = useState(false);
  const [newPolicyName, setNewPolicyName] = useState("");
  const [newPolicyLevels, setNewPolicyLevels] = useState([
    {
      id: "1",
      method: "EMAIL" as "EMAIL" | "SLACK" | "WEBHOOK",
      target: "",
      waitTimeMinutes: 60,
    },
  ]);
  const [newPolicyExpandedLevels, setNewPolicyExpandedLevels] = useState<
    Set<number>
  >(new Set([0]));
  const [newPolicyErrors, setNewPolicyErrors] = useState<
    Record<string, string>
  >({});

  
  const [alertWhen] = useState<string>("unavailable");

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    

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

    
    if (!selectedPolicyId) {
      newErrors.escalationPolicy = "Escalation policy is required";
    }

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
      
      if (!payload.escalationPolicyId) {
        setErrors((prev) => ({
          ...prev,
          escalationPolicy: "Escalation policy is required",
        }));
        return;
      }
      await createMutation.mutateAsync(payload);
      onSuccess?.();
    } catch (error) {
      
      const message = error instanceof Error ? error.message : String(error);
      const newErrors: Record<string, string> = {};
      if (/status/i.test(message) && /(enum|Active|Paused)/i.test(message)) {
        newErrors.status = "Status must be Active or Paused";
      }
      if (/url/i.test(message)) {
        newErrors.url = "Please enter a valid URL";
      }
      if (/timeout/i.test(message)) {
        newErrors.timeout = "Timeout must be greater than 0";
      }
      if (/check.?interval/i.test(message)) {
        newErrors.checkInterval = "Check interval must be greater than 0";
      }
      if (/escalation/i.test(message)) {
        newErrors.escalationPolicy = "Escalation policy is required";
      }
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
      }
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
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-1 space-y-2">
            <h3 className="text-lg font-semibold">What to monitor</h3>
            <p className="text-sm text-muted-foreground">
              Configure the target website you want to monitor. You can find
              add escalation policy in the escalation policies section to get Alerts Timely.
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

        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div className="md:col-span-1 space-y-2">
            <h3 className="text-lg font-semibold">Escalation Policies</h3>
            <p className="text-sm text-muted-foreground">
              Select an existing policy or create one.
            </p>
          </div>
          <Card className="md:col-span-2 z-0!">
            <CardContent className="pt-6 space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="escalationPolicy">Escalation policy</Label>

                {!policiesData?.escalationPolicies ||
                policiesData.escalationPolicies.length === 0 ? (
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                    <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <h4 className="text-sm font-medium mb-2">
                      No escalation policies yet
                    </h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first escalation policy to define how
                      incidents should be handled when they are not acknowledged
                      in time.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        console.log("Creating policy");
                        setIsCreatePolicyOpen(true);
                      }}
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
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsCreatePolicyOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create
                      </Button>
                    </div>
                    {errors.escalationPolicy && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.escalationPolicy}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      This policy will be linked to the monitor.
                    </p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        
        

     
      </div>

      
      <Dialog open={isCreatePolicyOpen} onOpenChange={setIsCreatePolicyOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Escalation Policy</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            
            <div className="space-y-2">
              <Label htmlFor="newPolicyName">Policy Name *</Label>
              <Input
                id="newPolicyName"
                placeholder="Enter policy name"
                value={newPolicyName}
                onChange={(e) => setNewPolicyName(e.target.value)}
                className={newPolicyErrors.name ? "border-destructive" : ""}
              />
              {newPolicyErrors.name && (
                <p className="text-sm text-destructive">
                  {newPolicyErrors.name}
                </p>
              )}
            </div>

            <Separator />

            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">
                  Escalation Levels
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (newPolicyLevels.length >= 10) return;
                    const newLevel = {
                      id: Date.now().toString(),
                      method: "EMAIL" as "EMAIL" | "SLACK" | "WEBHOOK",
                      target: "",
                      waitTimeMinutes: 60,
                    };
                    setNewPolicyLevels([...newPolicyLevels, newLevel]);
                    setNewPolicyExpandedLevels(
                      (prev) => new Set([...prev, newPolicyLevels.length])
                    );
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Level
                </Button>
              </div>

              <div className="space-y-4">
                {newPolicyLevels.map((level, index) => (
                  <Card key={level.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <button
                        type="button"
                        onClick={() => {
                          setNewPolicyExpandedLevels((prev) => {
                            const newSet = new Set(prev);
                            if (newSet.has(index)) {
                              newSet.delete(index);
                            } else {
                              newSet.add(index);
                            }
                            return newSet;
                          });
                        }}
                        className="font-medium text-left flex items-center gap-2"
                      >
                        <span>Level {index + 1}</span>
                        {!newPolicyExpandedLevels.has(index) && (
                          <>
                            {level.method && level.target ? (
                              <span className="text-xs text-muted-foreground">
                                - {level.method} → {level.target}
                              </span>
                            ) : (
                              <span className="text-xs text-orange-500">
                                ⚠ Incomplete
                              </span>
                            )}
                          </>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {newPolicyExpandedLevels.has(index) ? "▼" : "▶"}
                        </span>
                      </button>
                      {newPolicyLevels.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const updated = newPolicyLevels.filter(
                              (_, i) => i !== index
                            );
                            setNewPolicyLevels(updated);
                            setNewPolicyExpandedLevels((prev) => {
                              const newSet = new Set(prev);
                              newSet.delete(index);
                              
                              const adjustedSet = new Set<number>();
                              newSet.forEach((i) => {
                                if (i > index) {
                                  adjustedSet.add(i - 1);
                                } else {
                                  adjustedSet.add(i);
                                }
                              });
                              return adjustedSet;
                            });
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {newPolicyExpandedLevels.has(index) && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Method *</Label>
                          <Select
                            value={level.method}
                            onValueChange={(value) => {
                              const updatedLevels = [...newPolicyLevels];
                              updatedLevels[index].method = value as
                                | "EMAIL"
                                | "SLACK"
                                | "WEBHOOK";
                              updatedLevels[index].target = "";
                              setNewPolicyLevels(updatedLevels);
                            }}
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
                          <Label>Target *</Label>
                          <Input
                            placeholder={
                              level.method === "EMAIL"
                                ? "email@example.com"
                                : level.method === "SLACK"
                                  ? "#channel-name"
                                  : "https://webhook-url.com"
                            }
                            value={level.target}
                            onChange={(e) => {
                              const updatedLevels = [...newPolicyLevels];
                              updatedLevels[index].target = e.target.value;
                              setNewPolicyLevels(updatedLevels);
                            }}
                            className={
                              newPolicyErrors[`level-${index}-target`]
                                ? "border-destructive"
                                : ""
                            }
                          />
                          {newPolicyErrors[`level-${index}-target`] && (
                            <p className="text-sm text-destructive">
                              {newPolicyErrors[`level-${index}-target`]}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Wait Time (minutes) *</Label>
                          <Input
                            type="number"
                            min={1}
                            max={1440}
                            placeholder="60"
                            value={level.waitTimeMinutes}
                            onChange={(e) => {
                              const updatedLevels = [...newPolicyLevels];
                              updatedLevels[index].waitTimeMinutes =
                                parseInt(e.target.value) || 0;
                              setNewPolicyLevels(updatedLevels);
                            }}
                            className={
                              newPolicyErrors[`level-${index}-waitTime`]
                                ? "border-destructive"
                                : ""
                            }
                          />
                          {newPolicyErrors[`level-${index}-waitTime`] && (
                            <p className="text-sm text-destructive">
                              {newPolicyErrors[`level-${index}-waitTime`]}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreatePolicyOpen(false);
                setNewPolicyName("");
                setNewPolicyLevels([
                  {
                    id: "1",
                    method: "EMAIL",
                    target: "",
                    waitTimeMinutes: 60,
                  },
                ]);
                setNewPolicyExpandedLevels(new Set([0]));
                setNewPolicyErrors({});
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={async () => {
                const errors: Record<string, string> = {};

                if (!newPolicyName.trim()) {
                  errors.name = "Policy name is required";
                } else if (newPolicyName.length > 100) {
                  errors.name = "Policy name cannot exceed 100 characters";
                }

                newPolicyLevels.forEach((level, index) => {
                  if (!level.target.trim()) {
                    errors[`level-${index}-target`] = "Target is required";
                  } else if (level.method === "EMAIL") {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(level.target)) {
                      errors[`level-${index}-target`] =
                        "Please enter a valid email address";
                    }
                  } else if (level.method === "WEBHOOK") {
                    try {
                      new URL(level.target);
                    } catch {
                      errors[`level-${index}-target`] =
                        "Please enter a valid URL";
                    }
                  }

                  if (level.waitTimeMinutes < 1) {
                    errors[`level-${index}-waitTime`] =
                      "Wait time must be at least 1 minute";
                  } else if (level.waitTimeMinutes > 1440) {
                    errors[`level-${index}-waitTime`] =
                      "Wait time cannot exceed 24 hours";
                  }
                });

                if (Object.keys(errors).length > 0) {
                  setNewPolicyErrors(errors);
                  return;
                }

                try {
                  const res = await createPolicyMutation.mutateAsync({
                    name: newPolicyName.trim(),
                    levels: newPolicyLevels.map((level, index) => ({
                      method: level.method,
                      target: level.target.trim(),
                      waitTimeMinutes:
                        index === newPolicyLevels.length - 1
                          ? 0
                          : level.waitTimeMinutes,
                    })),
                  });

                  setSelectedPolicyId(res.escalationPolicy.id);
                  setIsCreatePolicyOpen(false);
                  setNewPolicyName("");
                  setNewPolicyLevels([
                    {
                      id: "1",
                      method: "EMAIL",
                      target: "",
                      waitTimeMinutes: 60,
                    },
                  ]);
                  setNewPolicyExpandedLevels(new Set([0]));
                  setNewPolicyErrors({});
                } catch (error) {
                  console.error("Failed to create escalation policy:", error);
                }
              }}
              disabled={createPolicyMutation.isPending}
            >
              {createPolicyMutation.isPending ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                  Creating...
                </div>
              ) : (
                "Create Policy"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
      <div className="flex justify-end">
        <Button type="submit" disabled={createMutation.isPending}>
          {createMutation.isPending ? "Creating..." : "Create monitor"}
        </Button>
      </div>
    </form>
  );
}

export default AddMonitorForm;
