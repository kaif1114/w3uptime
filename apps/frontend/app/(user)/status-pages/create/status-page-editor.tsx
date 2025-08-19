"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useCreateStatusPage,
  useStatusPage,
  useUpdateStatusPage,
} from "@/hooks/useStatusPages";
import type { StatusPageSection, WidgetType } from "@/types/status-page";
import { Plus, Trash2, GripVertical, X } from "lucide-react";
import { useMonitors } from "@/hooks/useMonitors";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";

type Props = { mode: "create" | "edit"; id?: string };

export default function StatusPageEditor({ mode, id }: Props) {
  const router = useRouter();
  const createMutation = useCreateStatusPage();
  const updateMutation = useUpdateStatusPage();
  const { data } = useStatusPage(id || "");
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const [isPublished, setIsPublished] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoHrefUrl, setLogoHrefUrl] = useState("");
  const [contactUrl, setContactUrl] = useState("");
  const [historyRange, setHistoryRange] = useState("7d");
  const [sections, setSections] = useState<StatusPageSection[]>([]);
  const { data: monitorsData } = useMonitors();
  const [maintenances, setMaintenances] = useState(
    [] as {
      id: string;
      title: string;
      description?: string;
      start: string;
      end: string;
      status: "scheduled" | "in_progress" | "completed";
      affectedResourceIds?: string[];
    }[]
  );
  const [updates, setUpdates] = useState(
    [] as { id: string; title: string; body?: string; createdAt: string }[]
  );

  useMemo(() => {
    if (mode === "edit" && data) {
      setIsPublished(data.isPublished);
      setName(data.name);
      setLogoUrl(data.logoUrl || "");
      setLogoHrefUrl(data.logoHrefUrl || "");
      setContactUrl(data.contactUrl || "");
      setHistoryRange(data.historyRange);
      // Normalize resources to ensure stable ids and defaults
      const normalized = (data.sections || []).map((s: any) => ({
        ...s,
        resources: (s.resources || []).map((r: any) => ({
          id: r.id || crypto.randomUUID(),
          type: r.type,
          monitorId: r.monitorId,
          publicName: r.publicName || "",
          explanation: r.explanation || "",
          widgetType: r.widgetType || ("with_history" as const),
        })),
      }));
      setSections(normalized as unknown as StatusPageSection[]);
      setMaintenances(data.maintenances || []);
      setUpdates(data.updates || []);
    }
    return undefined;
  }, [mode, data]);

  function addSection() {
    const id = crypto.randomUUID();
    setSections((prev) => [
      ...prev,
      { id, name: "New section", resources: [] },
    ]);
  }

  function removeSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  function addResource(sectionId: string) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              resources: [
                ...s.resources,
                {
                  id: crypto.randomUUID(),
                  type: "monitor",
                  monitorId: "",
                  publicName: "",
                  explanation: "",
                  widgetType: "with_history" as WidgetType,
                },
              ],
            }
          : s
      )
    );
  }

  function updateResource(sectionId: string, index: number, monitorId: string) {
    setSections((prev) =>
      prev.map((s) =>
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

  function removeResource(sectionId: string, index: number) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              resources: s.resources.filter((_, i) => i !== index),
            }
          : s
      )
    );
  }

  function patchResource(
    sectionId: string,
    index: number,
    patch: Partial<{
      publicName: string;
      explanation?: string;
      widgetType: WidgetType;
    }>
  ) {
    setSections((prev) =>
      prev.map((s) =>
        s.id === sectionId
          ? {
              ...s,
              resources: s.resources.map((r, i) =>
                i === index ? { ...(r as any), ...patch } : r
              ),
            }
          : s
      )
    );
  }

  const hasChanges = () => {
    if (mode === "create") return true; // always allow first save
    if (!data) return false;
    return (
      isPublished !== data.isPublished ||
      name !== data.name ||
      (logoUrl || "") !== (data.logoUrl || "") ||
      (logoHrefUrl || "") !== (data.logoHrefUrl || "") ||
      (contactUrl || "") !== (data.contactUrl || "") ||
      historyRange !== data.historyRange ||
      JSON.stringify(sections) !== JSON.stringify(data.sections) ||
      JSON.stringify(maintenances) !==
        JSON.stringify(data.maintenances || []) ||
      JSON.stringify(updates) !== JSON.stringify(data.updates || [])
    );
  };

  async function onSave() {
    if (!name.trim()) {
      toast.error("Company name is required");
      return;
    }
    if (mode === "edit" && !hasChanges()) return; // no-op if nothing changed
    if (mode === "create") {
      const res = await createMutation.mutateAsync({
        name,
        isPublished,
        logoUrl: logoUrl || null,
        logoHrefUrl: logoHrefUrl || null,
        contactUrl: contactUrl || null,
        historyRange: historyRange as any,
        sections,
      });
      router.push(`/status-pages/${res.statusPage.id}`);
      toast.success("Status page created");
    } else if (id) {
      await updateMutation.mutateAsync({
        id,
        data: {
          name,
          isPublished,
          logoUrl: logoUrl || null,
          logoHrefUrl: logoHrefUrl || null,
          contactUrl: contactUrl || null,
          historyRange: historyRange as any,
          sections,
          maintenances,
          updates,
        },
      });
      toast.success("Changes saved");
    }
  }

  function moveSection(sectionId: string, direction: "up" | "down") {
    setSections((prev) => {
      const index = prev.findIndex((s) => s.id === sectionId);
      if (index === -1) return prev;
      const newIndex = direction === "up" ? index - 1 : index + 1;
      if (newIndex < 0 || newIndex >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(newIndex, 0, item);
      return next;
    });
  }

  // Maintenance handlers
  function addMaintenanceDraft() {
    const id = crypto.randomUUID();
    const now = new Date();
    const later = new Date(now.getTime() + 60 * 60 * 1000);
    setMaintenances((m) => [
      ...m,
      {
        id,
        title: "New maintenance",
        description: "",
        start: now.toISOString().slice(0, 16),
        end: later.toISOString().slice(0, 16),
        status: "scheduled",
      },
    ]);
  }

  function updateMaintenance(
    id: string,
    patch: Partial<{
      title: string;
      description?: string;
      start: string;
      end: string;
      status: "scheduled" | "in_progress" | "completed";
      affectedResourceIds?: string[];
    }>
  ) {
    setMaintenances((items) =>
      items.map((m) => (m.id === id ? { ...m, ...patch } : m))
    );
  }

  function removeMaintenance(id: string) {
    setMaintenances((items) => items.filter((m) => m.id !== id));
  }

  // Status updates handlers
  function addUpdateDraft() {
    const id = crypto.randomUUID();
    setUpdates((u) => [
      ...u,
      {
        id,
        title: "New update",
        body: "",
        createdAt: new Date().toISOString(),
      },
    ]);
  }

  function updateUpdate(
    id: string,
    patch: Partial<{ title: string; body?: string }>
  ) {
    setUpdates((items) =>
      items.map((u) => (u.id === id ? { ...u, ...patch } : u))
    );
  }

  function removeUpdate(id: string) {
    setUpdates((items) => items.filter((u) => u.id !== id));
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          {mode === "create" ? "Create status page" : "Status page"}
        </h1>
      </div>

      <Tabs defaultValue="overview">
        {mode === "create" && (
          <div className="mt-2 mb-4">
            <Alert>
              <AlertDescription>
                Fill out Overview and click Save changes to unlock Structure,
                Maintenance, and Status updates.
              </AlertDescription>
            </Alert>
          </div>
        )}
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="structure" disabled={mode === "create"}>
            Structure
          </TabsTrigger>
          <TabsTrigger value="maintenance" disabled={mode === "create"}>
            Maintenance
          </TabsTrigger>
          <TabsTrigger value="updates" disabled={mode === "create"}>
            Status updates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-[300px,1fr]">
            <aside className="space-y-6 text-sm text-muted-foreground">
              <section>
                <h3 className="mb-1 text-base font-medium text-foreground">
                  Basic information
                </h3>
                <p>
                  A public status page informs your users about the uptime of
                  your services.
                </p>
              </section>
              <section>
                <h3 className="mb-1 text-base font-medium text-foreground">
                  Links & URLs
                </h3>
                <p>
                  Where should we point your users when they want to visit your
                  website?
                </p>
                <p className="mt-2">
                  You can use{" "}
                  <span className="font-mono">mailto:support@example.com</span>.
                  Leave blank for no ‘Get in touch’ button.
                </p>
              </section>
              <section>
                <h3 className="mb-1 text-base font-medium text-foreground">
                  Personalization
                </h3>
                <p>
                  Upload your logo to personalize the look &amp; feel of your
                  status page.
                </p>
                <p className="mt-2">
                  Use modern look for refreshed design with latest features like
                  dark theme, translations, and custom favicon.
                </p>
              </section>
            </aside>
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Status page published</h3>
                    <p className="text-sm text-muted-foreground">
                      Make your page public
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor="published">Published</Label>
                    <input
                      id="published"
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Stripe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="history">Status history</Label>
                    <Select
                      value={historyRange}
                      onValueChange={setHistoryRange}
                    >
                      <SelectTrigger id="history">
                        <SelectValue placeholder="7 days" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7d">7 Days</SelectItem>
                        <SelectItem value="30d">30 Days</SelectItem>
                        <SelectItem value="90d">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="logoUrl">Logo</Label>
                    <div className="flex gap-2">
                      {/* Hidden file input for uploads */}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={uploadInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = reader.result as string;
                            setLogoUrl(result);
                          };
                          reader.readAsDataURL(file);
                          // clear value so the same file can be re-selected later
                          e.currentTarget.value = "";
                        }}
                      />
                      <Input
                        id="logoUrl"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        placeholder="Paste image URL or data URL"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => uploadInputRef.current?.click()}
                      >
                        Upload
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Upload a logo or paste an image URL. Images uploaded here
                      are stored as data URLs for now (sufficient for preview
                      and prototyping; we can wire S3 later).
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="logoHref">Logo link URL</Label>
                    <Input
                      id="logoHref"
                      value={logoHrefUrl}
                      onChange={(e) => setLogoHrefUrl(e.target.value)}
                      placeholder="https://example.com"
                    />
                    <p className="text-xs text-muted-foreground">
                      When someone clicks your logo, we’ll take them to this URL
                      (usually your homepage).
                    </p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="contact">Get in touch URL</Label>
                    <Input
                      id="contact"
                      value={contactUrl}
                      onChange={(e) => setContactUrl(e.target.value)}
                      placeholder="https://example.com/support"
                    />
                    <p className="text-xs text-muted-foreground">
                      You can use mailto:support@example.com. Leave blank for no
                      ‘Get in touch’ button.
                    </p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    onClick={onSave}
                    disabled={
                      createMutation.isPending ||
                      updateMutation.isPending ||
                      (mode === "edit" && !hasChanges())
                    }
                  >
                    Save changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="structure" className="mt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Sections</h3>
                <Button variant="secondary" onClick={addSection}>
                  <Plus className="h-4 w-4 mr-2" /> Add section
                </Button>
              </div>

              <div className="space-y-3">
                {sections.map((section, idx) => (
                  <div
                    key={section.id}
                    className="border rounded-md p-3 space-y-3"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData("text/plain", String(idx));
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const from = Number(e.dataTransfer.getData("text/plain"));
                      const to = idx;
                      if (Number.isNaN(from) || from === to) return;
                      setSections((prev) => {
                        const next = [...prev];
                        const [item] = next.splice(from, 1);
                        next.splice(to, 0, item);
                        return next;
                      });
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={section.name}
                        onChange={(e) =>
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === section.id
                                ? { ...s, name: e.target.value }
                                : s
                            )
                          )
                        }
                        className="max-w-sm"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSection(section.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <div className="ml-auto text-xs text-muted-foreground">
                        Drag to reorder
                      </div>
                    </div>

                    <div className="space-y-2">
                      {section.resources.map((res, idx) => (
                        <div key={idx} className="flex items-center gap-3">
                          <Select
                            value={res.monitorId}
                            onValueChange={(v) =>
                              updateResource(section.id, idx, v)
                            }
                          >
                            <SelectTrigger className="w-80">
                              <SelectValue placeholder="Select monitor" />
                            </SelectTrigger>
                            <SelectContent>
                              {monitorsData?.monitors.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                  {m.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            className="w-64"
                            placeholder="Public name"
                            value={(res as any).publicName || ""}
                            onChange={(e) =>
                              patchResource(section.id, idx, {
                                publicName: e.target.value,
                              })
                            }
                          />
                          <Select
                            value={
                              ((res as any).widgetType as WidgetType) ||
                              "with_history"
                            }
                            onValueChange={(v) =>
                              patchResource(section.id, idx, {
                                widgetType: v as WidgetType,
                              })
                            }
                          >
                            <SelectTrigger className="w-56">
                              <SelectValue placeholder="Widget type" />
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
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="Remove resource"
                            onClick={() => removeResource(section.id, idx)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      {section.resources.length === 0 && (
                        <p className="text-xs text-destructive">
                          At least one resource is required for each section.
                        </p>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => addResource(section.id)}
                      >
                        <Plus className="h-4 w-4 mr-1" /> Add resource
                      </Button>
                    </div>
                  </div>
                ))}
                {sections.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No sections yet. Add your first section.
                  </p>
                )}
              </div>

              <div className="flex justify-end">
                <Button
                  onClick={onSave}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Scheduled maintenance</h3>
                <Button variant="secondary" onClick={addMaintenanceDraft}>
                  <Plus className="h-4 w-4 mr-2" /> Schedule maintenance
                </Button>
              </div>
              <div className="space-y-3">
                {maintenances.map((m) => (
                  <div key={m.id} className="border rounded-md p-3 space-y-3">
                    <div className="grid md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Title</Label>
                        <Input
                          value={m.title}
                          onChange={(e) =>
                            updateMaintenance(m.id, { title: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Status</Label>
                        <Select
                          value={m.status}
                          onValueChange={(v) =>
                            updateMaintenance(m.id, { status: v as any })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="scheduled">Scheduled</SelectItem>
                            <SelectItem value="in_progress">
                              In progress
                            </SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>Start</Label>
                        <Input
                          type="datetime-local"
                          value={m.start}
                          onChange={(e) =>
                            updateMaintenance(m.id, { start: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>End</Label>
                        <Input
                          type="datetime-local"
                          value={m.end}
                          onChange={(e) =>
                            updateMaintenance(m.id, { end: e.target.value })
                          }
                        />
                      </div>
                      <div className="md:col-span-2 space-y-1">
                        <Label>Description</Label>
                        <Textarea
                          value={m.description}
                          onChange={(e) =>
                            updateMaintenance(m.id, {
                              description: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Affected services</Label>
                      {sections.map((s) => (
                        <div key={s.id} className="space-y-1">
                          <div className="text-sm font-medium">
                            {s.name || "Untitled section"}
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                            {s.resources.map((r: any) => {
                              const checked = (
                                m.affectedResourceIds || []
                              ).includes(r.id);
                              return (
                                <label
                                  key={r.id}
                                  className="inline-flex items-center gap-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const next = new Set(
                                        m.affectedResourceIds || []
                                      );
                                      if (e.target.checked) next.add(r.id);
                                      else next.delete(r.id);
                                      updateMaintenance(m.id, {
                                        affectedResourceIds: Array.from(next),
                                      });
                                    }}
                                  />
                                  <span>
                                    {r.publicName || r.monitorId || "Resource"}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        onClick={() => removeMaintenance(m.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                {maintenances.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No maintenance scheduled.
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={onSave}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates" className="mt-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Status updates</h3>
                <Button variant="secondary" onClick={addUpdateDraft}>
                  <Plus className="h-4 w-4 mr-2" /> New update
                </Button>
              </div>
              <div className="space-y-3">
                {updates.map((u) => (
                  <div key={u.id} className="border rounded-md p-3 space-y-3">
                    <div className="space-y-1">
                      <Label>Title</Label>
                      <Input
                        value={u.title}
                        onChange={(e) =>
                          updateUpdate(u.id, { title: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Message</Label>
                      <Textarea
                        value={u.body}
                        onChange={(e) =>
                          updateUpdate(u.id, { body: e.target.value })
                        }
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        onClick={() => removeUpdate(u.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))}
                {updates.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No updates yet.
                  </p>
                )}
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={onSave}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  Save changes
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
