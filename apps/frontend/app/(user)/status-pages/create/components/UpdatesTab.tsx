"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Circle, Minus, AlertTriangle, Check } from "lucide-react";
import type { StatusPageSection, StatusPageResource } from "@/types/StatusPage";
import type { Monitor } from "@/types/monitor";

interface StatusUpdate {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
}

type AffectedStatus = "not_affected" | "downtime" | "degraded" | "resolved";

interface CreateReportData {
  title: string;
  description: string;
  publishedAt: string;
  notifySubscribers: boolean;
  affected: Record<string, AffectedStatus>;
  affectedSections: Array<{
    sectionId: string;
    status: "DOWNTIME" | "DEGRADED" | "RESOLVED";
  }>;
}

interface UpdatesTabProps {
  sections: StatusPageSection[];
  monitorsData: { monitors: Monitor[] };
  updates: StatusUpdate[];
  onCreateReport: (reportData: CreateReportData) => Promise<void>;
  isSaving: boolean;
  isCreatingReport: boolean;
  mode: "create" | "edit";
}

export function UpdatesTab({
  sections,
  monitorsData,
  updates,
  onCreateReport,
  isSaving,
  isCreatingReport,
  mode,
}: UpdatesTabProps) {
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportExpandedSections, setReportExpandedSections] = useState<Record<string, boolean>>({});

  
  const [reportDraft, setReportDraft] = useState({
    title: "",
    description: "",
    publishedAt: new Date().toISOString().slice(0, 16),
    notifySubscribers: false,
    affected: {} as Record<string, AffectedStatus>,
  });

  async function createReport() {
    if (mode === "create") {
      throw new Error("Save the status page first to create a report");
    }
    if (!reportDraft.title.trim()) {
      throw new Error("What's going on? is required");
    }
    if (!reportDraft.description.trim()) {
      throw new Error("Description is required");
    }

    
    const affectedSections = Object.entries(reportDraft.affected)
      .filter(([_, status]) => status !== "not_affected")
      .map(([resourceId, status]) => {
        
        const section = sections.find(s => 
          s.resources.some(r => r.id === resourceId)
        );
        return {
          sectionId: section?.id || resourceId, 
          status: status.toUpperCase() as "DOWNTIME" | "DEGRADED" | "RESOLVED"
        };
      });

    const payload = {
      title: reportDraft.title,
      description: reportDraft.description,
      publishedAt: new Date(reportDraft.publishedAt).toISOString(),
      notifySubscribers: reportDraft.notifySubscribers,
      affected: reportDraft.affected,
      affectedSections
    };

    await onCreateReport(payload);

    
    setReportDraft({
      title: "",
      description: "",
      publishedAt: new Date().toISOString().slice(0, 16),
      notifySubscribers: false,
      affected: {},
    });
    setShowReportForm(false);
  }

  if (!(showReportForm || updates.length > 0)) {
    return (
      <div className="min-h-[420px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold text-foreground">
            Nothing to report
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            You will see all your status reports here.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => setShowReportForm(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 h-11 text-base font-medium"
            >
              Create status report
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      
      <div className="flex gap-12">
        <div className="w-1/3 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Basic information
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Describe what happened, ETA for resolution, and where your
            customers can ask for help.
          </p>
        </div>
        <div className="w-2/3">
          <Card className="border border-border/50 bg-card shadow-sm">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    What&apos;s going on?
                  </Label>
                  <Input
                    value={reportDraft.title}
                    onChange={(e) =>
                      setReportDraft((d) => ({
                        ...d,
                        title: e.target.value,
                      }))
                    }
                    placeholder="Dashboard is unavailable"
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Concise summary of the incident.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    value={reportDraft.description}
                    onChange={(e) =>
                      setReportDraft((d) => ({
                        ...d,
                        description: e.target.value,
                      }))
                    }
                    placeholder="In-depth description of what's going on. You can use markdown."
                    className="min-h-[120px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Published at
                  </Label>
                  <Input
                    type="datetime-local"
                    value={reportDraft.publishedAt}
                    onChange={(e) =>
                      setReportDraft((d) => ({
                        ...d,
                        publishedAt: e.target.value,
                      }))
                    }
                    className="h-11 max-w-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={reportDraft.notifySubscribers}
                    onCheckedChange={(v) =>
                      setReportDraft((d) => ({
                        ...d,
                        notifySubscribers: Boolean(v),
                      }))
                    }
                  />
                  <span>Notify status page subscribers</span>
                </label>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      
      <div className="flex gap-12">
        <div className="w-1/3 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Affected services
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Please select all services affected by the current incident.
          </p>
        </div>
        <div className="w-2/3">
          <Card className="border border-border/50 bg-card shadow-sm">
            <CardContent className="p-6 space-y-4">
              {sections.map((s) => {
                const isExpanded = reportExpandedSections[s.id] ?? true;
                return (
                  <div
                    key={s.id}
                    className="rounded-md border border-border/40 bg-muted/20 overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-muted/40"
                      onClick={() =>
                        setReportExpandedSections((prev) => ({
                          ...prev,
                          [s.id]: !(prev[s.id] ?? true),
                        }))
                      }
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-medium">
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-0" : "-rotate-90"}`}
                        />
                        {s.name || "New section"}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="px-6 pb-4">
                        <div className="space-y-3 py-2">
                          {s.resources.map((r: StatusPageResource) => {
                            const monitorName =
                              monitorsData?.monitors.find(
                                (m: Monitor) => m.id === r.monitorId
                              )?.name;
                            const displayName =
                              monitorName || "Resource";
                            const current =
                              reportDraft.affected[r.id] ||
                              "not_affected";
                            return (
                              <div
                                key={r.id}
                                className="flex items-center justify-between gap-4"
                              >
                                <span className="text-sm">
                                  {displayName}
                                </span>
                                <div className="w-56">
                                  <Select
                                    value={current}
                                    onValueChange={(v) =>
                                      setReportDraft((d) => ({
                                        ...d,
                                        affected: {
                                          ...d.affected,
                                          [r.id]: v as AffectedStatus,
                                        },
                                      }))
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-sm border-border bg-background rounded-full">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="not_affected">
                                        <span className="inline-flex items-center gap-2">
                                          <Circle className="h-4 w-4 text-muted-foreground" />
                                          Not affected
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="downtime">
                                        <span className="inline-flex items-center gap-2">
                                          <Minus className="h-4 w-4 text-red-500" />
                                          Downtime
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="degraded">
                                        <span className="inline-flex items-center gap-2">
                                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                          Degraded
                                        </span>
                                      </SelectItem>
                                      <SelectItem value="resolved">
                                        <span className="inline-flex items-center gap-2">
                                          <Check className="h-4 w-4 text-green-500" />
                                          Resolved
                                        </span>
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              {sections.length === 0 && (
                <div className="rounded-md border border-border/40 bg-muted/20 overflow-hidden">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-muted/40"
                    onClick={() =>
                      setReportExpandedSections((prev) => ({
                        ...prev,
                        placeholder: !(prev.placeholder ?? true),
                      }))
                    }
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${(reportExpandedSections.placeholder ?? true) ? "rotate-0" : "-rotate-90"}`}
                      />
                      {"New section"}
                    </span>
                  </button>
                  {(reportExpandedSections.placeholder ??
                    true) && (
                    <div className="px-6 pb-4">
                      <div className="space-y-3 py-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm">
                            {"sabcube.vercel.app"}
                          </span>
                          <div className="w-56">
                            <Select
                              value={
                                reportDraft.affected[
                                  "placeholder-resource-1"
                                ] ?? "not_affected"
                              }
                              onValueChange={(v) =>
                                setReportDraft((d) => ({
                                  ...d,
                                  affected: {
                                    ...d.affected,
                                    ["placeholder-resource-1"]:
                                      v as AffectedStatus,
                                  },
                                }))
                              }
                            >
                              <SelectTrigger className="h-9 text-sm border-border bg-background rounded-full">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="not_affected">
                                  <span className="inline-flex items-center gap-2">
                                    <Circle className="h-4 w-4 text-muted-foreground" />
                                    Not affected
                                  </span>
                                </SelectItem>
                                <SelectItem value="downtime">
                                  <span className="inline-flex items-center gap-2">
                                    <Minus className="h-4 w-4 text-red-500" />
                                    Downtime
                                  </span>
                                </SelectItem>
                                <SelectItem value="degraded">
                                  <span className="inline-flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                                    Degraded
                                  </span>
                                </SelectItem>
                                <SelectItem value="resolved">
                                  <span className="inline-flex items-center gap-2">
                                    <Check className="h-4 w-4 text-green-500" />
                                    Resolved
                                  </span>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    </div>  
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      
      <div className="flex justify-end gap-4 pt-8">
        <Button
          variant="outline"
          onClick={() => setShowReportForm(false)}
          className="px-6"
        >
          Cancel
        </Button>
        <Button
          onClick={createReport}
          disabled={isSaving || isCreatingReport}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-6"
        >
          {isCreatingReport ? "Creating..." : "Create report"}
        </Button>
      </div>

      
      {updates.length > 0 && (
        <div className="flex gap-12">
          <div className="w-1/3 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Status updates
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Recent status updates for this status page.
            </p>
          </div>
          <div className="w-2/3">
            <div className="space-y-4">
              {updates.map((update) => (
                <Card key={update.id} className="border border-border/50 bg-card shadow-sm">
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h4 className="font-medium text-foreground">
                          {update.title}
                        </h4>
                        <div className="text-xs text-muted-foreground">
                          {new Date(update.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {update.body && (
                        <p className="text-sm text-muted-foreground">
                          {update.body}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
