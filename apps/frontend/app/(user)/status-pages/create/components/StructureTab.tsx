"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GripVertical, Plus, X } from "lucide-react";
import type { StatusPageSection, WidgetType } from "@/types/StatusPage";
import type { Monitor } from "@/types/monitor";

interface StructureTabProps {
  sections: StatusPageSection[];
  setSections: (sections: StatusPageSection[]) => void;
  monitorsData: { monitors: Monitor[] };
  onSave: () => void;
  isSaving: boolean;
  hasChanges: boolean;
}

export function StructureTab({
  sections,
  setSections,
  monitorsData,
  onSave,
  isSaving,
  hasChanges,
}: StructureTabProps) {
  
  function addSection() {
    const id = crypto.randomUUID();
    setSections([
      ...sections,
      {
        id,
        name: "",
        widgetType: "with_history" as WidgetType,
        resources: [
          {
            id: crypto.randomUUID(),
            type: "monitor",
            monitorId: "",
          },
        ],
      },
    ]);
  }

  function removeSection(sectionId: string) {
    setSections(sections.filter((s) => s.id !== sectionId));
  }

  function updateResource(sectionId: string, index: number, monitorId: string) {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              resources: s.resources.map((r, i) =>
                i === index ? { ...r, monitorId } : r
              ),
            }
          : s
      )
    );
  }

  function updateSectionWidgetType(sectionId: string, widgetType: WidgetType) {
    setSections(
      sections.map((s) =>
        s.id === sectionId ? { ...s, widgetType } : s
      )
    );
  }

  function removeResource(sectionId: string, index: number) {
    setSections(
      sections.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              resources: s.resources.filter((_, i) => i !== index),
            }
          : s
      )
    );
  }


  return (
    <div className="space-y-12">
      
      <div className="flex gap-12">
        <div className="w-1/3 space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Monitors & heartbeats
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Pick the monitors and heartbeats you want to display on your
            status page. You can re-order the monitors by dragging the
            cards, as well as give each monitor a public name and a short
            explanation of the service it is monitoring.
          </p>
        </div>
        <div className="w-2/3">
          <Card className="border border-border/50 bg-card shadow-sm">
            <CardContent className="p-8 space-y-6">
              <div className="space-y-4">
                {sections.map((section, idx) => (
                  <div
                    key={section.id}
                    className="border border-border/50 rounded-lg p-6 space-y-4 bg-background/50"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(idx));
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const from = Number(
                        e.dataTransfer.getData("text/plain")
                      );
                      const to = idx;
                      if (Number.isNaN(from) || from === to) return;
                      const next = [...sections];
                      const [item] = next.splice(from, 1);
                      next.splice(to, 0, item);
                      setSections(next);
                    }}
                  >
                    <div className="space-y-4">
                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-foreground">
                          Section name
                        </Label>
                        <Input
                          value={section.name}
                          onChange={(e) =>
                            setSections(
                              sections.map((s) =>
                                s.id === section.id
                                  ? { ...s, name: e.target.value }
                                  : s
                              )
                            )
                          }
                          placeholder="New section"
                          className="h-10"
                        />
                        <p className="text-xs text-muted-foreground">
                          Leave blank to hide the section heading.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-foreground">
                          Widget Type
                        </Label>
                        <Select
                          value={section.widgetType || "with_history"}
                          onValueChange={(v) =>
                            updateSectionWidgetType(section.id, v as WidgetType)
                          }
                        >
                          <SelectTrigger className="h-10 text-sm border-border bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="current">
                              Current status only
                            </SelectItem>
                            <SelectItem value="with_history">
                              With status history
                            </SelectItem>
                            <SelectItem value="with_history_chart">
                              With status history & chart
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <Label className="text-sm font-medium text-foreground">
                          Resources
                        </Label>
                        <div className="space-y-4">
                          {section.resources.map((res, resIdx) => (
                            <div
                              key={resIdx}
                              className="flex items-start gap-3 p-3 border border-border/30 rounded-lg bg-background/30"
                            >
                              <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-2" />
                              <div className="flex-1">
                                
                                <div className="space-y-2 w-full">
                                  <Label className="text-xs font-medium text-foreground">
                                    Monitor
                                  </Label>
                                  <Select
                                    value={res.monitorId}
                                    onValueChange={(v) =>
                                      updateResource(section.id, resIdx, v)
                                    }
                                  >
                                    <SelectTrigger className="h-9 text-sm border-border bg-background rounded-full w-full">
                                      <SelectValue placeholder="Select monitor" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {monitorsData?.monitors.map((m: Monitor) => (
                                        <SelectItem key={m.id} value={m.id}>
                                          {m.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Remove resource"
                                onClick={() =>
                                  removeResource(section.id, resIdx)
                                }
                                className="h-8 w-8 mt-2"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSection(section.id)}
                          className="h-8 text-destructive hover:text-destructive"
                        >
                          Remove section
                        </Button>
                        <div className="text-xs text-muted-foreground">
                          Drag to reorder
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <Button
                    variant="ghost"
                    onClick={addSection}
                    className="h-12 w-full border-0"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Add section
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end pt-8">
        <Button
          onClick={onSave}
          disabled={isSaving || !hasChanges}
          className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 h-12 text-base font-medium"
        >
          {isSaving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}
