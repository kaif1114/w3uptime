import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useCreateStatusPage,
  useUpdateStatusPage,
  useStatusPage,
} from "@/hooks/useStatusPages";
import {
  useMaintenances,
  useCreateMaintenance,
  useUpdateMaintenance,
  useDeleteMaintenance,
  type Maintenance as MaintenanceType,
  type CreateMaintenanceData,
} from "@/hooks/useMaintenances";
import type { StatusPageSection } from "@/types/status-page";

type Maintenance = MaintenanceType;

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
  
  // TanStack Query mutations
  const createMutation = useCreateStatusPage();
  const updateMutation = useUpdateStatusPage();
  const createMaintenanceMutation = useCreateMaintenance();
  const updateMaintenanceMutation = useUpdateMaintenance();
  const deleteMaintenanceMutation = useDeleteMaintenance();

  // Custom mutation for creating status reports
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
      console.log("Status report created successfully:", response.update);
      
      // Invalidate status page data to refresh updates
      queryClient.invalidateQueries({ 
        queryKey: ["status-page", variables.statusPageId] 
      });
      
      // Optimistically update the status page cache with the new update
      queryClient.setQueryData(
        ["status-page", variables.statusPageId],
        (oldData: any) => {
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
    onError: (error: any) => {
      console.error("Error creating status report:", error);
      toast.error(error.message || "Failed to create status report");
    },
  });

  // Core state management
  const [isPublished, setIsPublished] = useState(false);
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoHrefUrl, setLogoHrefUrl] = useState("");
  const [contactUrl, setContactUrl] = useState("");
  const [historyRange, setHistoryRange] = useState("7d");
  const [sections, setSections] = useState<StatusPageSection[]>([]);
  const [updates, setUpdates] = useState<StatusUpdate[]>([]);

  // Data fetching with TanStack Query
  const { 
    data: statusPageData, 
    isLoading,
    error: statusPageError 
  } = useStatusPage(id || "");
  
  const { 
    data: maintenancesData,
    error: maintenancesError 
  } = useMaintenances(id || "");

  // Use maintenances from API instead of local state
  const maintenances = maintenancesData?.maintenances || [];

  // Load data when in edit mode
  useEffect(() => {
    if (mode === "edit" && statusPageData && !isLoading) {
      setIsPublished(statusPageData.isPublished || false);
      setName(statusPageData.name || "");
      setLogoUrl(statusPageData.logoUrl || "");
      setLogoHrefUrl(statusPageData.logoHrefUrl || "");
      setContactUrl(statusPageData.contactUrl || "");
      setHistoryRange(statusPageData.historyRange || "7d");
      
      // Normalize sections data
      const normalizedSections = (statusPageData.sections || []).map((s: any) => ({
        ...s,
        resources: (s.resources || []).map((r: any) => ({
          id: r.id || crypto.randomUUID(),
          type: r.type || "monitor",
          monitorId: r.monitorId || "",
          publicName: r.publicName || "",
          explanation: r.explanation || "",
          widgetType: r.widgetType || "with_history" as any,
        })),
      }));
      
      setSections(normalizedSections);
      setUpdates(statusPageData.updates || []);
    }
  }, [mode, statusPageData, isLoading]);

  // Check if there are unsaved changes
  const hasChanges = () => {
    // In create mode, always return true if name is provided (form is ready to save)
    if (mode === "create") return name.trim() !== ""; 
    
    // In edit mode, compare with loaded data
    if (!statusPageData) return false;
    
    return (
      isPublished !== (statusPageData.isPublished || false) ||
      name !== (statusPageData.name || "") ||
      logoUrl !== (statusPageData.logoUrl || "") ||
      logoHrefUrl !== (statusPageData.logoHrefUrl || "") ||
      contactUrl !== (statusPageData.contactUrl || "") ||
      historyRange !== (statusPageData.historyRange || "7d") ||
      JSON.stringify(sections) !== JSON.stringify(statusPageData.sections || []) ||
      JSON.stringify(updates) !== JSON.stringify(statusPageData.updates || [])
    );
  };

  // Save handler with improved error handling
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Company name is required");
      return;
    }

    const saveData = {
      isPublished,
      name,
      logoUrl: logoUrl || null,
      logoHrefUrl: logoHrefUrl || null,
      contactUrl: contactUrl || null,
      historyRange: historyRange as "7d" | "30d" | "90d",
      sections,
      maintenances: [],
      updates,
    };

    console.log("🔍 Attempting to save with data:", saveData);
    console.log("🔍 Mode:", mode);

    try {
      if (mode === "create") {
        console.log("🔍 Creating new status page...");
        const result = await createMutation.mutateAsync(saveData);
        console.log("✅ Create result:", result);
        
        // Redirect to edit mode with the new ID
        if (result?.statusPage?.id) {
          console.log("🔍 Redirecting to:", `/status-pages/${result.statusPage.id}`);
          router.push(`/status-pages/${result.statusPage.id}`);
        }
      } else {
        console.log("🔍 Updating existing status page...", id);
        const result = await updateMutation.mutateAsync({
          id: id || "",
          data: saveData,
        });
        console.log("✅ Update result:", result);
      }
    } catch (error: any) {
      console.error("❌ Save error:", error);
      console.error("❌ Error message:", error?.message);
      console.error("❌ Error response:", error?.response?.data);
      
      // Show more specific error messages
      if (error?.message?.includes("authentication") || error?.message?.includes("unauthorized")) {
        toast.error("Authentication failed. Please log in again.");
      } else if (error?.message?.includes("validation") || error?.message?.includes("invalid")) {
        toast.error("Invalid data. Please check your inputs.");
      } else {
        toast.error(`Failed to save status page: ${error?.message || "Unknown error"}`);
      }
    }
  };

  // Maintenance handlers with TanStack Query
  const removeMaintenance = async (maintenanceId: string) => {
    if (!id) return; // Need status page ID
    
    try {
      await deleteMaintenanceMutation.mutateAsync({
        statusPageId: id,
        maintenanceId,
      });
      // Success toast is handled in the mutation's onSuccess
    } catch (error) {
      console.error("Error deleting maintenance:", error);
      // Error toast is handled in the mutation's onError
    }
  };

  const createMaintenance = async (maintenanceData: CreateMaintenanceData) => {
    if (!id) {
      throw new Error("Status page ID is required");
    }

    await createMaintenanceMutation.mutateAsync({
      statusPageId: id,
      data: maintenanceData,
    });
    // Success toast is handled in the mutation's onSuccess
  };

  // Create report handler with TanStack Query
  const createReport = async (payload: CreateReportData) => {
    if (!id) {
      throw new Error("Status page ID is required");
    }

    await createReportMutation.mutateAsync({
      statusPageId: id,
      data: payload,
    });
    // Success/error handling is done in the mutation's callbacks
  };

  return {
    // State
    isPublished,
    setIsPublished,
    name,
    setName,
    logoUrl,
    setLogoUrl,
    logoHrefUrl,
    setLogoHrefUrl,
    contactUrl,
    setContactUrl,
    historyRange,
    setHistoryRange,
    sections,
    setSections,
    updates,
    setUpdates,
    maintenances,
    
    // Loading states
    isLoading,
    isSaving: createMutation.isPending || updateMutation.isPending,
    isCreatingReport: createReportMutation.isPending,
    isCreatingMaintenance: createMaintenanceMutation.isPending,
    isDeletingMaintenance: deleteMaintenanceMutation.isPending,
    
    // Error states
    statusPageError,
    maintenancesError,
    
    // Computed values
    hasChanges: hasChanges(),
    
    // Actions
    handleSave,
    removeMaintenance,
    createMaintenance,
    createReport,
  };
}
