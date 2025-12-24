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
import { useSlackChannels, SlackChannel, WorkspaceChannels } from "@/hooks/useSlackChannels";

export interface SelectedSlackChannel {
  teamId: string;
  teamName: string;
  channelId: string;
  channelName: string;
}

interface SlackChannelSelectorProps {
  selectedChannels: SelectedSlackChannel[];
  onChannelsChange: (channels: SelectedSlackChannel[]) => void;
  placeholder?: string;
}

export default function SlackChannelSelector({
  selectedChannels,
  onChannelsChange,
  placeholder = "Select Slack channels...",
}: SlackChannelSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data, isLoading, error } = useSlackChannels();

  const handleChannelSelect = (
    workspace: WorkspaceChannels,
    channel: SlackChannel
  ) => {
    const channelKey = `${workspace.teamId}-${channel.id}`;
    const existingIndex = selectedChannels.findIndex(
      (sc) => sc.teamId === workspace.teamId && sc.channelId === channel.id
    );

    if (existingIndex >= 0) {
      
      const newChannels = selectedChannels.filter((_, index) => index !== existingIndex);
      onChannelsChange(newChannels);
    } else {
      
      const newChannel: SelectedSlackChannel = {
        teamId: workspace.teamId,
        teamName: workspace.teamName,
        channelId: channel.id,
        channelName: channel.name,
      };
      onChannelsChange([...selectedChannels, newChannel]);
    }
  };

  const removeChannel = (channelToRemove: SelectedSlackChannel) => {
    const newChannels = selectedChannels.filter(
      (channel) =>
        !(
          channel.teamId === channelToRemove.teamId &&
          channel.channelId === channelToRemove.channelId
        )
    );
    onChannelsChange(newChannels);
  };

  const isChannelSelected = (teamId: string, channelId: string) => {
    return selectedChannels.some(
      (sc) => sc.teamId === teamId && sc.channelId === channelId
    );
  };

  if (error) {
    return (
      <div className="text-sm text-destructive">
        Failed to load Slack channels. Please check your Slack integration.
      </div>
    );
  }

  if (!data?.workspaces || data.workspaces.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No Slack workspaces connected. Please connect a Slack workspace first.
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
              "Loading channels..."
            ) : selectedChannels.length > 0 ? (
              `${selectedChannels.length} channel${selectedChannels.length > 1 ? "s" : ""} selected`
            ) : (
              placeholder
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="Search channels..." />
            <CommandList>
              <CommandEmpty>No channels found.</CommandEmpty>
              {data.workspaces.map((workspace) => (
                <CommandGroup key={workspace.teamId} heading={workspace.teamName}>
                  {workspace.channels.map((channel) => (
                    <CommandItem
                      key={`${workspace.teamId}-${channel.id}`}
                      value={`${workspace.teamName} ${channel.name}`}
                      onSelect={() => handleChannelSelect(workspace, channel)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          isChannelSelected(workspace.teamId, channel.id)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      <span className="flex items-center gap-2">
                        {channel.isPrivate ? "🔒" : "#"}
                        {channel.name}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedChannels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedChannels.map((channel) => (
            <Badge
              key={`${channel.teamId}-${channel.channelId}`}
              variant="secondary"
              className="flex items-center gap-1"
            >
              <Slack className="h-3 w-3" />
              {channel.teamName} - #{channel.channelName}
              <button
                type="button"
                onClick={() => removeChannel(channel)}
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