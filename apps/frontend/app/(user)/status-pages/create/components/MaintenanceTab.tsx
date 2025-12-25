"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, Trash2 } from "lucide-react";
import type { StatusPageSection, StatusPageResource } from "@/types/StatusPage";
import type { Maintenance as MaintenanceType, CreateMaintenanceData } from "@/hooks/useMaintenances";
import type { Monitor } from "@/types/monitor";

type Maintenance = MaintenanceType;

interface MaintenanceTabProps {
  sections: StatusPageSection[];
  monitorsData: Monitor[];
  maintenances: Maintenance[];
  onRemoveMaintenance: (maintenanceId: string) => void;
  onCreateMaintenance: (maintenanceData: CreateMaintenanceData) => Promise<void>;
  isSaving: boolean;
  isCreatingMaintenance: boolean;
  isDeletingMaintenance: boolean;
  mode: "create" | "edit";
}

export function MaintenanceTab({
  sections,
  monitorsData,
  maintenances,
  onRemoveMaintenance,
  onCreateMaintenance,
  isSaving,
  isCreatingMaintenance,
  isDeletingMaintenance,
  mode,
}: MaintenanceTabProps) {
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [dummyAffectedIds, setDummyAffectedIds] = useState<string[]>([]);

  
  const [maintenanceDraft, setMaintenanceDraft] = useState({
    title: "",
    description: "",
    start: "",
    end: "",
    affectedResourceIds: [] as string[],
  });

  function updateMaintenanceDraft(
    patch: Partial<{
      title: string;
      description?: string;
      start: string;
      end: string;
      affectedResourceIds: string[];
    }>
  ) {
    setMaintenanceDraft((prev) => ({ ...prev, ...patch }));
  }

  async function scheduleMaintenance() {
    if (mode === "create") {
      throw new Error("Save the status page first to schedule maintenance");
    }

    const { title, start, end } = maintenanceDraft;
    if (!title.trim()) {
      throw new Error("Title is required");
    }
    if (!start || !end) {
      throw new Error("Please set both From and To date & time");
    }
    if (new Date(end).getTime() <= new Date(start).getTime()) {
      throw new Error("End time must be after start time");
    }

    const maintenanceData = {
      title: maintenanceDraft.title,
      description: maintenanceDraft.description || "",
      from: maintenanceDraft.start,
      to: maintenanceDraft.end,
    };

    await onCreateMaintenance(maintenanceData);

    
    setMaintenanceDraft({
      title: "",
      description: "",
      start: "",
      end: "",
      affectedResourceIds: [],
    });
  }

  if (!(showMaintenanceForm || maintenances.length > 0)) {
    return (
      <div className="min-h-[420px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold text-foreground">
            No maintenance scheduled
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Notify customers of any changes in availability during
            upcoming scheduled maintenance.
          </p>
          <div className="pt-2">
            <Button
              onClick={() => setShowMaintenanceForm(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 h-11 text-base font-medium"
            >
              Schedule maintenance
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
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Schedule maintenance
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Describe what will happen and when. Select which services
              are affected and schedule the maintenance.
            </p>
          </div>
        </div>
        <div className="w-2/3 space-y-8">
          <Card className="border border-border/50 bg-card shadow-sm">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    What&apos;s going on?
                  </Label>
                  <Input
                    value={maintenanceDraft.title}
                    onChange={(e) =>
                      updateMaintenanceDraft({ title: e.target.value })
                    }
                    placeholder="Authentication systems maintenance"
                    className="h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Description
                  </Label>
                  <Textarea
                    value={maintenanceDraft.description}
                    onChange={(e) =>
                      updateMaintenanceDraft({
                        description: e.target.value,
                      })
                    }
                    placeholder="In-depth description of what's going on. You can use markdown here."
                    className="min-h-[100px]"
                  />
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">From</Label>
                    <Input
                      type="datetime-local"
                      value={maintenanceDraft.start}
                      onChange={(e) =>
                        updateMaintenanceDraft({
                          start: e.target.value,
                        })
                      }
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">To</Label>
                    <Input
                      type="datetime-local"
                      value={maintenanceDraft.end}
                      onChange={(e) =>
                        updateMaintenanceDraft({ end: e.target.value })
                      }
                      className="h-10"
                    />
                  </div>
                </div>
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
            Please select all services affected by the maintenance.
          </p>
        </div>
        <div className="w-2/3">
          <Card className="border border-border/50 bg-card shadow-sm">
            <CardContent className="p-6 space-y-4">
              {sections.map((s) => {
                const sectionResourceIds = s.resources.map(
                  (r: StatusPageResource) => r.id
                );
                const selectedIds = new Set(
                  maintenanceDraft.affectedResourceIds || []
                );
                const areAllSelected =
                  sectionResourceIds.length > 0 &&
                  sectionResourceIds.every((rid) =>
                    selectedIds.has(rid)
                  );

                const isExpanded = expandedSections[s.id] ?? true;

                return (
                  <div
                    key={s.id}
                    className="rounded-md border border-border/40 bg-muted/20 overflow-hidden"
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-6 py-3 text-left hover:bg-muted/40"
                      onClick={() =>
                        setExpandedSections((prev) => ({
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
                      <div className="px-6 pb-3">
                        <div className="space-y-3 py-2">
                          {s.resources.map((r: StatusPageResource) => {
                            const checked = (
                              maintenanceDraft.affectedResourceIds || []
                            ).includes(r.id);
                            const monitorName =
                              monitorsData?.find(
                                (m: Monitor) => m.id === r.monitorId
                              )?.name;
                            const displayName =
                              monitorName || "Resource";
                            return (
                              <label
                                key={r.id}
                                className="flex items-center gap-3 text-sm"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(val) => {
                                    const next = new Set(
                                      maintenanceDraft.affectedResourceIds ||
                                        []
                                    );
                                    if (Boolean(val)) next.add(r.id);
                                    else next.delete(r.id);
                                    updateMaintenanceDraft({
                                      affectedResourceIds:
                                        Array.from(next),
                                    });
                                  }}
                                />
                                <span>{displayName}</span>
                              </label>
                            );
                          })}
                        </div>

                        <div className="mt-2 -mx-6 border-t border-border/40 bg-muted/40 px-6 py-3">
                          <button
                            type="button"
                            className="text-sm font-medium text-primary hover:underline"
                            onClick={() => {
                              let nextIds: string[];
                              if (areAllSelected) {
                                nextIds = (
                                  maintenanceDraft.affectedResourceIds ||
                                  []
                                ).filter(
                                  (rid) =>
                                    !sectionResourceIds.includes(rid)
                                );
                              } else {
                                const merged = new Set<string>(
                                  maintenanceDraft.affectedResourceIds ||
                                    []
                                );
                                sectionResourceIds.forEach((rid) =>
                                  merged.add(rid)
                                );
                                nextIds = Array.from(merged);
                              }
                              updateMaintenanceDraft({
                                affectedResourceIds: nextIds,
                              });
                            }}
                          >
                            {areAllSelected
                              ? "Clear all"
                              : "Select all"}
                          </button>
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
                      setExpandedSections((prev) => ({
                        ...prev,
                        placeholder: !(prev.placeholder ?? true),
                      }))
                    }
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          (expandedSections.placeholder ??
                          true)
                            ? "rotate-0"
                            : "-rotate-90"
                        }`}
                      />
                      {"New section"}
                    </span>
                  </button>

                  {(expandedSections.placeholder ?? true) ? (
                    <div className="px-6 pb-3">
                      <div className="space-y-3 py-2">
                        <label className="flex items-center gap-3 text-sm">
                          <Checkbox
                            checked={dummyAffectedIds.includes(
                              "placeholder-resource-1"
                            )}
                            onCheckedChange={(val) => {
                              const next = new Set(dummyAffectedIds);
                              if (Boolean(val))
                                next.add("placeholder-resource-1");
                              else
                                next.delete("placeholder-resource-1");
                              setDummyAffectedIds(Array.from(next));
                            }}
                          />
                          <span>{"sabcube.vercel.app"}</span>
                        </label>
                      </div>

                      <div className="mt-2 -mx-6 border-t border-border/40 bg-muted/40 px-6 py-3">
                        <button
                          type="button"
                          className="text-sm font-medium text-primary hover:underline"
                          onClick={() => {
                            const allIds = ["placeholder-resource-1"];
                            const allSelected = allIds.every((rid) =>
                              dummyAffectedIds.includes(rid)
                            );
                            setDummyAffectedIds(
                              allSelected ? [] : allIds
                            );
                          }}
                        >
                          {(() => {
                            const allIds = ["placeholder-resource-1"];
                            const allSelected = allIds.every((rid) =>
                              dummyAffectedIds.includes(rid)
                            );
                            return allSelected
                              ? "Clear all"
                              : "Select all";
                          })()}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="pt-4">
            <Button
              onClick={scheduleMaintenance}
              disabled={isSaving || isCreatingMaintenance}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 h-12 text-base font-medium"
            >
              {isCreatingMaintenance ? "Scheduling..." : "Schedule maintenance"}
            </Button>
          </div>
        </div>
      </div>

      
      {maintenances.length > 0 && (
        <div className="flex gap-12">
          <div className="w-1/3 space-y-4">
            <h2 className="text-xl font-semibold text-foreground">
              Scheduled maintenances
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              View and manage your scheduled maintenance windows.
            </p>
          </div>
          <div className="w-2/3">
            <div className="space-y-4">
              {maintenances.map((maintenance: Maintenance) => (
                <Card key={maintenance.id} className="border border-border/50 bg-card shadow-sm">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <h4 className="font-medium text-foreground">
                          {maintenance.title}
                        </h4>
                        {maintenance.description && (
                          <p className="text-sm text-muted-foreground">
                            {maintenance.description}
                          </p>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {new Date(maintenance.start).toLocaleString()} -{" "}
                          {new Date(maintenance.end).toLocaleString()}
                        </div>
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {maintenance.status}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveMaintenance(maintenance.id)}
                        disabled={isDeletingMaintenance}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
