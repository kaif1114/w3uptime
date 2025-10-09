"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useMonitors } from "@/hooks/useMonitors";
import { useStatusPageEditor } from "./hooks/useStatusPageEditor";
import { OverviewTab } from "./components/OverviewTab";
import { StructureTab } from "./components/StructureTab";
import { MaintenanceTab } from "./components/MaintenanceTab";
import { UpdatesTab } from "./components/UpdatesTab";

type Props = { mode: "create" | "edit"; id?: string };

export default function StatusPageEditor({ mode, id }: Props) {
  const { data: monitorsData } = useMonitors();
  const {
    
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
    maintenances,
    
    
    isLoading,
    isSaving,
    isCreatingReport,
    isCreatingMaintenance,
    isDeletingMaintenance,
    
    
    statusPageError,
    maintenancesError,
    
    
    hasChanges,
    
    
    handleSave,
    removeMaintenance,
    createMaintenance,
    createReport,
  } = useStatusPageEditor(mode, id);

  
  if (statusPageError) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load status page: {statusPageError.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (maintenancesError) {
    console.warn("Failed to load maintenances:", maintenancesError);
  }

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-lg text-muted-foreground">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className=" py-8">
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

        <TabsContent value="overview">
          <OverviewTab
            isPublished={isPublished}
            setIsPublished={setIsPublished}
            name={name}
            setName={setName}
            logoUrl={logoUrl}
            setLogoUrl={setLogoUrl}
            logoLinkUrl={logoLinkUrl}
            setLogoLinkUrl={setLogoLinkUrl}
            supportUrl={supportUrl}
            setSupportUrl={setSupportUrl}
            historyRange={historyRange}
            setHistoryRange={setHistoryRange}
            onSave={handleSave}
            isSaving={isSaving}
            hasChanges={hasChanges}
            mode={mode}
          />
        </TabsContent>

        <TabsContent value="structure">
          <StructureTab
            sections={sections}
            setSections={setSections}
            monitorsData={monitorsData || { monitors: [] }}
            onSave={handleSave}
            isSaving={isSaving}
            hasChanges={hasChanges}
          />
        </TabsContent>

        <TabsContent value="maintenance">
          <MaintenanceTab
            sections={sections}
            monitorsData={monitorsData?.monitors || []}
            maintenances={maintenances}
            onRemoveMaintenance={removeMaintenance}
            onCreateMaintenance={createMaintenance}
            isSaving={isSaving}
            isCreatingMaintenance={isCreatingMaintenance}
            isDeletingMaintenance={isDeletingMaintenance}
            mode={mode}
          />
        </TabsContent>

        <TabsContent value="updates">
          <UpdatesTab
            sections={sections}
            monitorsData={monitorsData || { monitors: [] }}
            updates={updates}
            onCreateReport={createReport}
            isSaving={isSaving}
            isCreatingReport={isCreatingReport}
            mode={mode}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
