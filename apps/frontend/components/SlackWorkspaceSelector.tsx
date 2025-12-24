"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Slack } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useSlackIntegrations } from "@/hooks/useSlackIntegration";

interface SlackIntegration {
  id: string;
  teamId: string;
  teamName: string;
  scope: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
  defaultChannelId?: string;
  defaultChannelName?: string;
  webhookUrl?: string;
}

export interface SelectedSlackWorkspace {
  teamId: string;
  teamName: string;
  defaultChannelId: string;
  defaultChannelName: string;
}

interface SlackWorkspaceSelectorProps {
  selectedWorkspaces: SelectedSlackWorkspace[];
  onWorkspacesChange: (workspaces: SelectedSlackWorkspace[]) => void;
  placeholder?: string;
  maxSelections?: number;
}

export default function SlackWorkspaceSelector({
  selectedWorkspaces,
  onWorkspacesChange,
  placeholder = "Select Slack workspaces...",
  maxSelections,
}: SlackWorkspaceSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useSlackIntegrations();

  const handleWorkspaceSelect = (integration: SlackIntegration) => {
    const existingIndex = selectedWorkspaces.findIndex(
      (sw) => sw.teamId === integration.teamId
    );

    if (existingIndex >= 0) {
      
      const newWorkspaces = selectedWorkspaces.filter((_, index) => index !== existingIndex);
      onWorkspacesChange(newWorkspaces);
    } else {
      
      const newWorkspace: SelectedSlackWorkspace = {
        teamId: integration.teamId,
        teamName: integration.teamName,
        defaultChannelId: integration.defaultChannelId || "general",
        defaultChannelName: integration.defaultChannelName || "general",
      };
      
      if (maxSelections === 1) {
        
        onWorkspacesChange([newWorkspace]);
      } else if (!maxSelections || selectedWorkspaces.length < maxSelections) {
        
        onWorkspacesChange([...selectedWorkspaces, newWorkspace]);
      }
    }
  };

  const removeWorkspace = (workspaceToRemove: SelectedSlackWorkspace) => {
    const newWorkspaces = selectedWorkspaces.filter(
      (workspace) => workspace.teamId !== workspaceToRemove.teamId
    );
    onWorkspacesChange(newWorkspaces);
  };

  const isWorkspaceSelected = (teamId: string) => {
    return selectedWorkspaces.some((sw) => sw.teamId === teamId);
  };

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load Slack workspaces. Please check your Slack integration.
      </div>
    );
  }

  const availableWorkspaces = data?.integrations?.filter(
    integration => integration.isActive
  ) || [];

  if (availableWorkspaces.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No Slack workspaces found. Please connect a Slack workspace first in Settings.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            disabled={isLoading}
          >
            {isLoading ? (
              "Loading workspaces..."
            ) : selectedWorkspaces.length > 0 ? (
              maxSelections === 1 
                ? selectedWorkspaces[0].teamName
                : `${selectedWorkspaces.length} workspace${selectedWorkspaces.length > 1 ? "s" : ""} selected`
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search workspaces..." />
            <CommandList>
              <CommandEmpty>No workspaces found.</CommandEmpty>
              <CommandGroup>
                {availableWorkspaces.map((integration) => (
                  <CommandItem
                    key={integration.teamId}
                    value={integration.teamName}
                    onSelect={() => handleWorkspaceSelect(integration)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        isWorkspaceSelected(integration.teamId)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2">
                      <Slack className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium">{integration.teamName}</div>
                        <div className="text-xs text-muted-foreground">
                          {integration.defaultChannelName 
                            ? `#${integration.defaultChannelName}`
                            : "Default channel not configured"
                          }
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedWorkspaces.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedWorkspaces.map((workspace) => (
            <Badge
              key={workspace.teamId}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <Slack className="h-3 w-3" />
              {workspace.teamName} - #{workspace.defaultChannelName}
              <button
                type="button"
                onClick={() => removeWorkspace(workspace)}
                className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-sm"
              >
                ×
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}