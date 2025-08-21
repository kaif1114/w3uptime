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
import {
  Plus,
  Trash2,
  GripVertical,
  X,
  ChevronDown,
  Circle,
  Minus,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useMonitors } from "@/hooks/useMonitors";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";

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
  const maintenanceRefs = useRef<Record<string, HTMLDivElement | null>>({});
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
  const [maintenanceDraft, setMaintenanceDraft] = useState({
    title: "",
    description: "",
    start: "",
    end: "",
    affectedResourceIds: [] as string[],
  });
  const [updates, setUpdates] = useState(
    [] as { id: string; title: string; body?: string; createdAt: string }[]
  );
  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [dummyAffectedIds, setDummyAffectedIds] = useState<string[]>([]);

  // Create report (status update) draft state – mirrors provided design
  type AffectedStatus = "not_affected" | "downtime" | "degraded" | "resolved";
  const [reportDraft, setReportDraft] = useState({
    title: "",
    description: "",
    publishedAt: new Date().toISOString().slice(0, 16), // for datetime-local
    notifySubscribers: false,
    affected: {} as Record<string, AffectedStatus>, // key = resourceId
  });
  const [reportExpandedSections, setReportExpandedSections] = useState<
    Record<string, boolean>
  >({});

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
      {
        id,
        name: "New section",
        resources: [
          {
            id: crypto.randomUUID(),
            type: "monitor",
            monitorId: "",
            publicName: "",
            explanation: "",
            widgetType: "with_history" as WidgetType,
          },
        ],
      },
    ]);
  }

  function removeSection(sectionId: string) {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
  }

  function addResource(sectionId: string) {
    // Remove this function as we only allow one resource per section
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
    // Scroll the newly created maintenance block into view
    setTimeout(() => {
      const el = maintenanceRefs.current[id];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 0);
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
      toast.error("Save the status page first to schedule maintenance");
      return;
    }
    const { title, start, end } = maintenanceDraft;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!start || !end) {
      toast.error("Please set both From and To date & time");
      return;
    }
    if (new Date(end).getTime() <= new Date(start).getTime()) {
      toast.error("End time must be after start time");
      return;
    }
    const newItem = {
      id: crypto.randomUUID(),
      title: maintenanceDraft.title,
      description: maintenanceDraft.description || "",
      start: maintenanceDraft.start,
      end: maintenanceDraft.end,
      status: "scheduled" as const,
      affectedResourceIds: maintenanceDraft.affectedResourceIds,
    };

    const nextMaintenances = [...maintenances, newItem];
    setMaintenances(nextMaintenances);

    if (id) {
      await updateMutation.mutateAsync({
        id,
        data: { maintenances: nextMaintenances },
      });
    }

    // Reset draft after successful schedule
    setMaintenanceDraft({
      title: "",
      description: "",
      start: "",
      end: "",
      affectedResourceIds: [],
    });
    toast.success("Maintenance scheduled");
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

  // Create report handler (adds a new status update)
  async function createReport() {
    if (mode === "create") {
      toast.error("Save the status page first to create a report");
      return;
    }
    if (!reportDraft.title.trim()) {
      toast.error("What's going on? is required");
      return;
    }
    const newUpdate = {
      id: crypto.randomUUID(),
      title: reportDraft.title,
      body: reportDraft.description,
      createdAt: new Date(reportDraft.publishedAt).toISOString(),
    };
    const nextUpdates = [newUpdate, ...updates];
    setUpdates(nextUpdates);
    if (id) {
      await updateMutation.mutateAsync({ id, data: { updates: nextUpdates } });
    }
    toast.success("Report created");
    setReportDraft((prev) => ({
      ...prev,
      title: "",
      description: "",
      // keep publishedAt as-is so users can post multiple
    }));
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          {mode === "create" ? "Create status page" : "Status page"}
        </h1>
      </div>

      <Tabs defaultValue="overview" className="space-y-8">
        {mode === "create" && (
          <div className="mb-6">
            <Alert className="border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-200">
              <AlertDescription>
                Fill out Overview and click Save changes to unlock Structure,
                Maintenance, and Status updates.
              </AlertDescription>
            </Alert>
          </div>
        )}

        <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1 rounded-lg">
          <TabsTrigger value="overview" className="rounded-md">
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="structure"
            disabled={mode === "create"}
            className="rounded-md"
          >
            Structure
          </TabsTrigger>
          <TabsTrigger
            value="maintenance"
            disabled={mode === "create"}
            className="rounded-md"
          >
            Maintenance
          </TabsTrigger>
          <TabsTrigger
            value="updates"
            disabled={mode === "create"}
            className="rounded-md"
          >
            Status updates
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-12">
          {/* Basic information section */}
          <div className="flex gap-12">
            <div className="w-1/3 space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-semibold text-foreground">
                  Basic information
                </h2>
                <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  Billable
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A public status page informs your users about the uptime of your
                services.
              </p>
            </div>
            <div className="w-2/3">
              <Card className="border border-border/50 bg-card shadow-sm">
                <CardContent className="p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-foreground text-base">
                        Status page published
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Make your page public
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium text-foreground">
                        Published
                      </span>
                      <button
                        onClick={() => setIsPublished(!isPublished)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                          isPublished ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            isPublished ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label
                        htmlFor="name"
                        className="text-sm font-medium text-foreground"
                      >
                        Company name *
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Stripe"
                        className="h-11 border-border bg-background"
                      />
                    </div>
                    <div className="space-y-3">
                      <Label
                        htmlFor="history"
                        className="text-sm font-medium text-foreground"
                      >
                        Status history
                      </Label>
                      <Select
                        value={historyRange}
                        onValueChange={setHistoryRange}
                      >
                        <SelectTrigger
                          id="history"
                          className="h-11 border-border bg-background"
                        >
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
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Links & URLs section */}
          <div className="flex gap-12">
            <div className="w-1/3 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Links & URLs
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Where should we point your users when they want to visit your
                website?
              </p>
            </div>
            <div className="w-2/3">
              <Card className="border border-border/50 bg-card shadow-sm">
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label
                        htmlFor="logoHref"
                        className="text-sm font-medium text-foreground"
                      >
                        What URL should your logo point to?
                      </Label>
                      <Input
                        id="logoHref"
                        value={logoHrefUrl}
                        onChange={(e) => setLogoHrefUrl(e.target.value)}
                        placeholder="https://stripe.com"
                        className="h-11 border-border bg-background"
                      />
                    </div>

                    {/** Removed homepage field per requirements */}

                    <div className="space-y-3">
                      <Label
                        htmlFor="contact"
                        className="text-sm font-medium text-foreground"
                      >
                        Get in touch URL
                      </Label>
                      <Input
                        id="contact"
                        value={contactUrl}
                        onChange={(e) => setContactUrl(e.target.value)}
                        placeholder="https://stripe.com/support"
                        className="h-11 border-border bg-background"
                      />
                      <p className="text-xs text-muted-foreground mt-2">
                        You can use mailto:support@stripe.com. Leave blank for
                        no 'Get in touch' button.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-foreground">
                        Logo
                      </Label>
                      <div
                        className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer"
                        onClick={() => uploadInputRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = () => {
                            const result = reader.result as string;
                            setLogoUrl(result);
                          };
                          reader.readAsDataURL(file);
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            uploadInputRef.current?.click();
                          }
                        }}
                      >
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                            <svg
                              className="w-6 h-6 text-muted-foreground"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              Drag & drop or click to choose
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Upload a logo
                            </p>
                          </div>
                        </div>
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
                            e.currentTarget.value = "";
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="flex justify-end pt-8">
            <Button
              onClick={onSave}
              disabled={
                createMutation.isPending ||
                updateMutation.isPending ||
                (mode === "edit" && !hasChanges())
              }
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 h-12 text-base font-medium"
            >
              Save changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="structure" className="space-y-12">
          {/* Monitors & heartbeats section */}
          <div className="flex gap-12">
            <div className="w-1/3 space-y-4">
              <h2 className="text-xl font-semibold text-foreground">
                Monitors & heartbeats
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Pick the monitors and heartbeats you want to display on your
                status page. You can re-order the monitors by dragging the
                cards, as well as give each monitor a public name and a short
                explanation of the service it's monitoring.
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
                          setSections((prev) => {
                            const next = [...prev];
                            const [item] = next.splice(from, 1);
                            next.splice(to, 0, item);
                            return next;
                          });
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
                                setSections((prev) =>
                                  prev.map((s) =>
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
                              Resources
                            </Label>
                            <div className="space-y-4">
                              {section.resources.map((res, resIdx) => (
                                <div
                                  key={resIdx}
                                  className="flex items-start gap-3 p-3 border border-border/30 rounded-lg bg-background/30"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab mt-2" />
                                  <div className="flex-1 space-y-3">
                                    {/* Name field */}
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium text-foreground">
                                        Name
                                      </Label>
                                      <Input
                                        value={res.publicName || ""}
                                        onChange={(e) =>
                                          patchResource(section.id, resIdx, {
                                            publicName: e.target.value,
                                          })
                                        }
                                        placeholder="Enter resource name"
                                        className="h-9 text-sm border-border bg-background rounded-full"
                                      />
                                    </div>

                                    {/* Widget type dropdown - in the middle */}
                                    <div className="space-y-2">
                                      <Label className="text-xs font-medium text-foreground">
                                        Widget Type
                                      </Label>
                                      <Select
                                        value={
                                          (res as any).widgetType ||
                                          "with_history"
                                        }
                                        onValueChange={(v) =>
                                          patchResource(section.id, resIdx, {
                                            widgetType: v as WidgetType,
                                          })
                                        }
                                      >
                                        <SelectTrigger className="h-9 text-sm border-border bg-background">
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

                                    {/* Monitor dropdown */}
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
                                          {monitorsData?.monitors.map((m) => (
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
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 h-12 text-base font-medium"
            >
              Save changes
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-12">
          <div className="flex gap-12">
            <div className="w-1/3 space-y-4">
              <div className="space-y-4">
                <h2 className="text-xl font-semibold text-foreground">
                  Schedule maintenance
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Describe what will happen and when. Select which services are
                  affected and schedule the maintenance.
                </p>
              </div>
            </div>
            <div className="w-2/3 space-y-8">
              <Card className="border border-border/50 bg-card shadow-sm">
                <CardContent className="p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">
                        What's going on?
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
                      <Label className="text-sm font-medium">Description</Label>
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
                            updateMaintenanceDraft({ start: e.target.value })
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
                      (r: any) => r.id
                    );
                    const selectedIds = new Set(
                      maintenanceDraft.affectedResourceIds || []
                    );
                    const areAllSelected =
                      sectionResourceIds.length > 0 &&
                      sectionResourceIds.every((rid) => selectedIds.has(rid));

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
                              {s.resources.map((r: any) => {
                                const checked = (
                                  maintenanceDraft.affectedResourceIds || []
                                ).includes(r.id);
                                const monitorName = monitorsData?.monitors.find(
                                  (m) => m.id === r.monitorId
                                )?.name;
                                const displayName =
                                  r.publicName || monitorName || "Resource";
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
                                          affectedResourceIds: Array.from(next),
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
                                      maintenanceDraft.affectedResourceIds || []
                                    ).filter(
                                      (rid) => !sectionResourceIds.includes(rid)
                                    );
                                  } else {
                                    const merged = new Set<string>(
                                      maintenanceDraft.affectedResourceIds || []
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
                                {areAllSelected ? "Clear all" : "Select all"}
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
                              ((expandedSections as any).placeholder ?? true)
                                ? "rotate-0"
                                : "-rotate-90"
                            }`}
                          />
                          {"New section"}
                        </span>
                      </button>

                      {((expandedSections as any).placeholder ?? true) ? (
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
                                  else next.delete("placeholder-resource-1");
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
                                setDummyAffectedIds(allSelected ? [] : allIds);
                              }}
                            >
                              {(() => {
                                const allIds = ["placeholder-resource-1"];
                                const allSelected = allIds.every((rid) =>
                                  dummyAffectedIds.includes(rid)
                                );
                                return allSelected ? "Clear all" : "Select all";
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
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 h-12 text-base font-medium"
                >
                  Schedule maintenance
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="updates" className="space-y-12">
          {/* Basic information for report */}
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
                        What's going on?
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
                      <Label className="text-sm font-medium">Description</Label>
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

          {/* Affected services */}
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
                              {s.resources.map((r: any) => {
                                const monitorName = monitorsData?.monitors.find(
                                  (m) => m.id === r.monitorId
                                )?.name;
                                const displayName =
                                  r.publicName || monitorName || "Resource";
                                const current =
                                  reportDraft.affected[r.id] || "not_affected";
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
                            className={`h-4 w-4 transition-transform ${((reportExpandedSections as any).placeholder ?? true) ? "rotate-0" : "-rotate-90"}`}
                          />
                          {"New section"}
                        </span>
                      </button>
                      {((reportExpandedSections as any).placeholder ??
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

              <div className="pt-4 flex justify-end">
                <Button
                  onClick={createReport}
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-3 h-12 text-base font-medium"
                >
                  Create report
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
