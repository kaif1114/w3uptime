"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMonitor, useUpdateMonitor } from "@/hooks/useMonitors";
import { useEscalationPolicies } from "@/hooks/useEscalationPolicies";
import { Monitor } from "@/types/monitor";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Loader2, Plus, Save, TestTube, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const toast = {
  success: (message: string) => {
    alert(`${message}`);
  },
  error: (message: string) => {
    alert(`${message}`);
  },
  warning: (message: string) => {
    alert(`${message}`);
  },
};

const editMonitorSchema = z.object({
  name: z.string().min(1, "Monitor name is required"),
  url: z.url("Please enter a valid URL"),
  timeout: z.number().int().min(1).max(300),
  checkInterval: z.number().int().min(60).max(3600),
  status: z.enum(["ACTIVE", "PAUSED"]),
  expectedStatusCodes: z
    .array(z.number().int().min(100).max(599))
    .min(1, "At least one status code is required"),
  escalationPolicyId: z
    .string()
    .min(1, "An escalation policy must be selected"),
});

type EditMonitorFormData = z.infer<typeof editMonitorSchema>;

interface EditMonitorFormProps {
  monitorId: string;
}

export function EditMonitorForm({ monitorId }: EditMonitorFormProps) {
  const { data: monitor, isLoading, error } = useMonitor(monitorId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/4"></div>
              <div className="h-10 bg-muted rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="mx-auto h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load monitor</h3>
        <p className="text-muted-foreground mb-4">
          Please try refreshing the page.
        </p>
      </div>
    );
  }

  if (!monitor) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Monitor not found</h3>
        <p className="text-muted-foreground">The monitor could not be found.</p>
      </div>
    );
  }

  return <EditMonitorFormContent monitor={monitor} />;
}

function EditMonitorFormContent({ monitor }: { monitor: Monitor }) {
  const router = useRouter();
  const updateMonitor = useUpdateMonitor();
  const { data: escalationPolicies, isLoading: loadingPolicies } =
    useEscalationPolicies();
  const [statusCodes, setStatusCodes] = useState<number[]>(
    monitor.expectedStatusCodes
  );
  const [newStatusCode, setNewStatusCode] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    setValue,
    watch,
    reset,
    
  } = useForm<EditMonitorFormData>({
    // @ts-expect-error - Zod v4 compatibility issue with @hookform/resolvers v5.2.2
    resolver: zodResolver(editMonitorSchema),
    defaultValues: {
      name: monitor.name,
      url: monitor.url,
      timeout: monitor.timeout,
      checkInterval: monitor.checkInterval,
      status:
        monitor.status === "DOWN" || monitor.status === "RECOVERING"
          ? "PAUSED"
          : monitor.status === "ACTIVE"
            ? "ACTIVE"
            : "PAUSED",
      expectedStatusCodes: monitor.expectedStatusCodes,
      escalationPolicyId: monitor.escalationPolicyId || "",
    },
  });

  const watchedUrl = watch("url");

  const onSubmit = async (data: EditMonitorFormData) => {
    try {
      const updateData = {
        ...data,
        expectedStatusCodes: statusCodes,
      };

      await updateMonitor.mutateAsync({
        id: monitor.id,
        data: updateData,
      });

      toast.success("Monitor updated successfully");
      router.push(`/monitors/${monitor.id}`);
    } catch (error) {
      toast.error("Failed to update monitor");
      console.error("Error updating monitor:", error);
    }
  };

  const addStatusCode = () => {
    const code = parseInt(newStatusCode);
    if (code && code >= 100 && code <= 599 && !statusCodes.includes(code)) {
      const newCodes = [...statusCodes, code].sort((a, b) => a - b);
      setStatusCodes(newCodes);
      setValue("expectedStatusCodes", newCodes);
      setNewStatusCode("");
    }
  };

  const removeStatusCode = (code: number) => {
    const newCodes = statusCodes.filter((c) => c !== code);
    setStatusCodes(newCodes);
    setValue("expectedStatusCodes", newCodes);
  };

  const handleReset = () => {
    reset();
    setStatusCodes(monitor.expectedStatusCodes);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "PAUSED":
        return "secondary";
      case "DISABLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Monitor Name</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="My Website Monitor"
            className={errors.name ? "border-destructive" : ""}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select
            value={watch("status")}
            onValueChange={(value) =>
              setValue("status", value as "ACTIVE" | "PAUSED")
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant("ACTIVE")}>
                    Active
                  </Badge>
                  <span>Monitor is running</span>
                </div>
              </SelectItem>
              <SelectItem value="PAUSED">
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant("PAUSED")}>
                    Paused
                  </Badge>
                  <span>Monitor is paused</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      
      <div className="space-y-2">
        <Label htmlFor="url">Website URL</Label>

        <Input
          id="url"
          {...register("url")}
          placeholder="https://example.com"
          className={`flex-1 ${errors.url ? "border-destructive" : ""}`}
        />

        {errors.url && (
          <p className="text-sm text-destructive">{errors.url.message}</p>
        )}
      </div>

      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="checkInterval">Check Interval (seconds)</Label>
          <Select
            value={watch("checkInterval").toString()}
            onValueChange={(value) =>
              setValue("checkInterval", parseInt(value))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="60">1 minute</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
              <SelectItem value="600">10 minutes</SelectItem>
              <SelectItem value="900">15 minutes</SelectItem>
              <SelectItem value="1800">30 minutes</SelectItem>
              <SelectItem value="3600">1 hour</SelectItem>
            </SelectContent>
          </Select>
          {errors.checkInterval && (
            <p className="text-sm text-destructive">
              {errors.checkInterval.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="timeout">Timeout (seconds)</Label>
          <Select
            value={watch("timeout").toString()}
            onValueChange={(value) => setValue("timeout", parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 seconds</SelectItem>
              <SelectItem value="30">30 seconds</SelectItem>
              <SelectItem value="60">1 minute</SelectItem>
              <SelectItem value="120">2 minutes</SelectItem>
              <SelectItem value="300">5 minutes</SelectItem>
            </SelectContent>
          </Select>
          {errors.timeout && (
            <p className="text-sm text-destructive">{errors.timeout.message}</p>
          )}
        </div>
      </div>

      
      <div>
        <div>
          <div className="text-base">Expected Status Codes</div>
          <p className="text-sm text-muted-foreground">
            HTTP status codes that indicate a successful response
          </p>
        </div>
        <div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {statusCodes.map((code) => (
                <Badge
                  key={code}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {code}
                  <button
                    type="button"
                    onClick={() => removeStatusCode(code)}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                value={newStatusCode}
                onChange={(e) => setNewStatusCode(e.target.value)}
                placeholder="200"
                className="w-24"
                type="number"
                min="100"
                max="599"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addStatusCode}
                disabled={!newStatusCode}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {errors.expectedStatusCodes && (
              <p className="text-sm text-destructive">
                {errors.expectedStatusCodes.message}
              </p>
            )}
          </div>
        </div>
      </div>

      
      <div>
        <div>
          <div className="text-base">Escalation Policy</div>
          <p className="text-sm text-muted-foreground">
            Select an escalation policy to handle alerts when this monitor fails
            (required)
          </p>
        </div>
        <div>
          <div className="space-y-2">
            {loadingPolicies ? (
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  Loading escalation policies...
                </span>
              </div>
            ) : (
              <Select
                value={watch("escalationPolicyId") || ""}
                onValueChange={(value) => setValue("escalationPolicyId", value)}
              >
                <SelectTrigger
                  className={
                    errors.escalationPolicyId ? "border-destructive" : ""
                  }
                >
                  <SelectValue placeholder="Select an escalation policy (required)" />
                </SelectTrigger>
                <SelectContent>
                  {escalationPolicies?.escalationPolicies?.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{policy.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {policy.levels?.length || 0} levels
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {errors.escalationPolicyId && (
              <p className="text-sm text-destructive">
                {errors.escalationPolicyId.message}
              </p>
            )}

            
            {watch("escalationPolicyId") &&
              escalationPolicies?.escalationPolicies && (
                <div className="mt-2 p-3 bg-muted rounded-lg">
                  {(() => {
                    const selectedPolicy =
                      escalationPolicies.escalationPolicies.find(
                        (p) => p.id === watch("escalationPolicyId")
                      );
                    if (!selectedPolicy) return null;

                    return (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          {selectedPolicy.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {selectedPolicy.levels?.length || 0} escalation levels
                          configured
                        </p>
                        {selectedPolicy.levels &&
                          selectedPolicy.levels.length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              First level: {selectedPolicy.levels[0]?.method}{" "}
                              after {selectedPolicy.levels[0]?.waitTimeMinutes}{" "}
                              minutes
                            </div>
                          )}
                      </div>
                    );
                  })()}
                </div>
              )}
          </div>
        </div>
      </div>

      
      <div className="flex items-center justify-between pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={handleReset}
          disabled={!isDirty || updateMonitor.isPending}
        >
          Reset Changes
        </Button>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/monitors/${monitor.id}`)}
            disabled={updateMonitor.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isDirty || updateMonitor.isPending}
            className="min-w-24"
          >
            {updateMonitor.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}
