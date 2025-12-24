import {
  useCreateMaintenance,
  useDeleteMaintenance,
  useMaintenances,
  type CreateMaintenanceData,
} from "@/hooks/useMaintenances";
import {
  useCreateStatusPage,
  useStatusPage,
  useUpdateStatusPage,
} from "@/hooks/useStatusPages";
import type {
  StatusPage,
  StatusPageSection,
  WidgetType,
} from "@/types/StatusPage";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface StatusUpdate {
  id: string;
  title: string;
  body?: string;
  createdAt: string;
}

interface CreateReportData {
  title: string;
  description: string;
  publishedAt: string;
  notifySubscribers: boolean;
  affected: Record<string, "not_affected" | "downtime" | "degraded" | "resolved">;
  affectedSections: Array<{
    sectionId: string;
    status: "DOWNTIME" | "DEGRADED" | "RESOLVED";
  }>;
}

interface CreateReportResponse {
  update: {
    id: string;
    title: string;
    description: string;
    publishedAt: string;
  };
}

export function useStatusPageEditor(mode: "create" | "edit", id?: string) {
  const router = useRouter();
  const queryClient = useQueryClient();

  
  const createMutation = useCreateStatusPage();
  const updateMutation = useUpdateStatusPage();
  const createMaintenanceMutation = useCreateMaintenance();
  const deleteMaintenanceMutation = useDeleteMaintenance();

  
  const createReportMutation = useMutation<
    CreateReportResponse,
    Error,
    { statusPageId: string; data: CreateReportData }
  >({
    mutationFn: async ({ statusPageId, data }) => {
      const response = await fetch(`/api/custompage/${statusPageId}/reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create status update");
      }

      return response.json();
    },
    onSuccess: (response, variables) => {
      
      queryClient.invalidateQueries({
        queryKey: ["status-page", variables.statusPageId],
      });

      
      queryClient.setQueryData(
        ["status-page", variables.statusPageId],
        (oldData: StatusPage | undefined) => {
          if (!oldData) return oldData;

          const newUpdate: StatusUpdate = {
            id: response.update.id,
            title: response.update.title,
            body: response.update.description,
            createdAt: response.update.publishedAt,
          };

          return {
            ...oldData,
            updates: [newUpdate, ...(oldData.updates || [])],
          };
        }
      );

      toast.success("Status report created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create status report");
    },
  });

  
  const [isPublished, setIsPublished] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoLinkUrl, setLogoLinkUrl] = useState("");
  const [supportUrl, setSupportUrl] = useState("");
  const [historyRange, setHistoryRange] = useState("7d");
  const [sections, setSections] = useState<StatusPageSection[]>([]);
  const [updates, setUpdates] = useState<StatusUpdate[]>([]);
  const [removedSectionIds, setRemovedSectionIds] = useState<string[]>([]);

  
  const {
    data: statusPageData,
    isLoading,
    error: statusPageError,
  } = useStatusPage(id || "");

  const { data: maintenancesData, error: maintenancesError } = useMaintenances(
    id || ""
  );

  
  const maintenances = maintenancesData?.maintenances || [];

  
  useEffect(() => {
    if (mode === "edit" && statusPageData && !isLoading) {
      setIsPublished(statusPageData.isPublished || false);
      setName(statusPageData.name || "");
      setLogoUrl(statusPageData.logoUrl || "");
      setSupportUrl(statusPageData.supportUrl || "");
      setLogoLinkUrl(statusPageData.logoLinkUrl || "");
      setHistoryRange(statusPageData.historyRange || "7d");

      
      const normalizedSections = (statusPageData.sections || []).map(
        (s: StatusPageSection) => ({
          ...s,
          widgetType: s.widgetType || ("with_history" as WidgetType),
          resources: (s.resources || []).map(
            (r: {
              id?: string;
              type?: string;
              monitorId: string;
            }) => ({
              id: r.id || crypto.randomUUID(),
              type: "monitor" as const,
              monitorId: r.monitorId || "",
            })
          ),
        })
      );

      setSections(normalizedSections);
      setUpdates(statusPageData.updates || []);
    }
  }, [mode, statusPageData, isLoading]);

  
  const hasChanges = () => {
    
    if (mode === "create") return name.trim() !== "";

    
    if (!statusPageData) return false;

    return (
      isPublished !== (statusPageData.isPublished || false) ||
      name !== (statusPageData.name || "") ||
      logoUrl !== (statusPageData.logoUrl || "") ||
      supportUrl !== (statusPageData.supportUrl || "") ||
      logoLinkUrl !== (statusPageData.logoLinkUrl || "") ||
      historyRange !== (statusPageData.historyRange || "7d") ||
      JSON.stringify(sections) !==
        JSON.stringify(statusPageData.sections || []) ||
      JSON.stringify(updates) !== JSON.stringify(statusPageData.updates || [])
    );
  };

  
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Company name is required");
      return;
    }

    const saveData = {
      isPublished,
      name,
      logoUrl: logoUrl || null,
      logoLinkUrl: logoLinkUrl || null,
      supportUrl: supportUrl || null,
      historyRange: historyRange as "7d" | "30d" | "90d",
      sections,
      maintenances: [],
      updates,
    };

    const finalSaveData =
      removedSectionIds.length > 0
        ? { ...saveData, removedSectionIds }
        : saveData;

    try {
      if (mode === "create") {
        const result = await createMutation.mutateAsync(finalSaveData);

        
        if (result?.statusPage?.id) {
          router.push(`/status-pages/${result.statusPage.id}`);
        }
      } else {
        await updateMutation.mutateAsync({
          id: id || "",
          data: finalSaveData,
        });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      
      if (
        errorMessage?.includes("authentication") ||
        errorMessage?.includes("unauthorized")
      ) {
        toast.error("Authentication failed. Please log in again.");
      } else if (
        errorMessage?.includes("validation") ||
        errorMessage?.includes("invalid")
      ) {
        toast.error("Invalid data. Please check your inputs.");
      } else {
        toast.error(
          `Failed to save status page: ${errorMessage || "Unknown error"}`
        );
      }
    }
  };
  
  const removeSection = (sectionId: string) => {
    setSections((prev) => prev.filter((s) => s.id !== sectionId));
    setRemovedSectionIds((prev) =>
      prev.includes(sectionId) ? prev : [...prev, sectionId]
    );
  };

  
  const removeMaintenance = async (maintenanceId: string) => {
    if (!id) return; 

    await deleteMaintenanceMutation.mutateAsync({
      statusPageId: id,
      maintenanceId,
    });
    
  };

  const createMaintenance = async (maintenanceData: CreateMaintenanceData) => {
    if (!id) {
      throw new Error("Status page ID is required");
    }

    await createMaintenanceMutation.mutateAsync({
      statusPageId: id,
      data: maintenanceData,
    });
    
  };

  
  const createReport = async (payload: CreateReportData) => {
    if (!id) {
      throw new Error("Status page ID is required");
    }

    await createReportMutation.mutateAsync({
      statusPageId: id,
      data: payload,
    });
    
  };

  return {
    
    isPublished,
    setIsPublished,
    name,
    setName,
    logoUrl,
    setLogoUrl,
    logoLinkUrl,
    setLogoLinkUrl,
    supportUrl,
    setSupportUrl,
    historyRange,
    setHistoryRange,
    sections,
    setSections,
    updates,
    setUpdates,
    maintenances,
    removedSectionIds,

    
    isLoading,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isCreatingReport: createReportMutation.isPending,
    isCreatingMaintenance: createMaintenanceMutation.isPending,
    isDeletingMaintenance: deleteMaintenanceMutation.isPending,

    
    statusPageError,
    maintenancesError,

    
    hasChanges: hasChanges(),

    
    handleSave,
    removeMaintenance,
    createMaintenance,
    createReport,
    removeSection,
  };
}
