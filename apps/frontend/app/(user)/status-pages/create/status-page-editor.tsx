"use client";

import { useMemo, useState } from "react";
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
import type { StatusPageSection } from "@/types/status-page";
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
      setSections(data.sections);
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
              resources: [...s.resources, { type: "monitor", monitorId: "" }],
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

  async function onSave() {
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
                  <Select value={historyRange} onValueChange={setHistoryRange}>
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
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <Input
                    id="logoUrl"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logoHref">Logo link URL</Label>
                  <Input
                    id="logoHref"
                    value={logoHrefUrl}
                    onChange={(e) => setLogoHrefUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
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
                </div>
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
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className="border rounded-md p-3 space-y-3"
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
                      <div className="ml-auto flex gap-1">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => moveSection(section.id, "up")}
                        >
                          Move up
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => moveSection(section.id, "down")}
                        >
                          Move down
                        </Button>
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
