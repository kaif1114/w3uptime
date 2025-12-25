"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { EscalationMethod } from "@/types/EscalationPolicy";
import {
  GripVertical,
  Trash2,
  Mail,
  MessageSquare,
  Webhook,
} from "lucide-react";
import { useState } from "react";
import z from "zod";
import SlackWorkspaceSelector, { SelectedSlackWorkspace } from "@/components/SlackWorkspaceSelector";

interface EscalationLevelItemProps {
  level: number;
  method: EscalationMethod | "";
  target: string;
  slackWorkspaces?: SelectedSlackWorkspace[];
  waitTimeMinutes: number;
  onMethodChange: (method: EscalationMethod) => void;
  onTargetChange: (target: string) => void;
  onSlackWorkspacesChange?: (workspaces: SelectedSlackWorkspace[]) => void;
  onWaitTimeChange: (minutes: number) => void;
  onRemove: () => void;
  onDragStart: (event: React.DragEvent) => void;
  onDragOver: (event: React.DragEvent) => void;
  onDrop: (event: React.DragEvent) => void;
  isDragging: boolean;
  isLast: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const methodOptions = [
  { value: "EMAIL" as EscalationMethod, label: "Email", icon: Mail },
  { value: "SLACK" as EscalationMethod, label: "Slack", icon: MessageSquare },
  { value: "WEBHOOK" as EscalationMethod, label: "Webhook", icon: Webhook },
];

export function EscalationLevelItem({
  level,
  method,
  target,
  slackWorkspaces = [],
  waitTimeMinutes,
  onMethodChange,
  onTargetChange,
  onSlackWorkspacesChange,
  onWaitTimeChange,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  isLast,
  isExpanded,
  onToggleExpand,
}: EscalationLevelItemProps) {
  const [errors, setErrors] = useState<{ target?: string; waitTime?: string }>(
    {}
  );

  const validateTarget = (value: string) => {
    if (!value.trim()) {
      return "This field is required";
    }

    if (method === "EMAIL") {
      const result = z.email().safeParse(value);
      if (!result.success) {
        return "Please enter a valid email address";
      }
    } else if (method === "WEBHOOK") {
      try {
        new URL(value);
      } catch {
        return "Please enter a valid URL";
      }
    }

    return undefined;
  };

  const validateWaitTime = (value: number) => {
    if (value < 1) {
      return "Wait time must be at least 1 minute";
    }
    if (value > 1440) {
      return "Wait time cannot exceed 24 hours (1440 minutes)";
    }
    return undefined;
  };

  const handleTargetChange = (value: string) => {
    onTargetChange(value);
    const error = validateTarget(value);
    setErrors((prev) => ({ ...prev, target: error }));
  };

  const handleWaitTimeChange = (value: number) => {
    onWaitTimeChange(value);
    const error = validateWaitTime(value);
    setErrors((prev) => ({ ...prev, waitTime: error }));
  };

  const getTargetPlaceholder = () => {
    switch (method) {
      case "EMAIL":
        return "user@example.com";
      case "SLACK":
        return "Select Slack workspaces";
      case "WEBHOOK":
        return "https://webhook.example.com/alerts";
      default:
        return "Select a method first";
    }
  };

  const getTargetLabel = () => {
    switch (method) {
      case "EMAIL":
        return "Email Address";
      case "SLACK":
        return "Slack Workspace";
      case "WEBHOOK":
        return "Webhook URL";
      default:
        return "Target";
    }
  };

  return (
    <Card
      className={`transition-all duration-200 ${isDragging ? "opacity-50 rotate-2" : ""} border-l-4 border-l-blue-500`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="cursor-grab hover:cursor-grabbing">
              <GripVertical className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-medium flex items-center justify-center">
                {level}
              </div>
              <button
                type="button"
                onClick={onToggleExpand}
                className="font-medium text-left"
              >
                Escalation Level {level}
                {!isExpanded && method && (method === "SLACK" ? slackWorkspaces.length > 0 : target) && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    - {method} → {method === "SLACK" 
                      ? slackWorkspaces[0]?.teamName || "No workspace selected"
                      : target}
                  </span>
                )}
              </button>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor={`method-${level}`}>Escalation Method</Label>
              <Select value={method} onValueChange={onMethodChange}>
                <SelectTrigger id={`method-${level}`}>
                  <SelectValue placeholder="Select escalation method" />
                </SelectTrigger>
                <SelectContent>
                  {methodOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor={`target-${level}`}>{getTargetLabel()}</Label>
              {method === "SLACK" ? (
                <SlackWorkspaceSelector
                  selectedWorkspaces={slackWorkspaces}
                  onWorkspacesChange={onSlackWorkspacesChange || (() => {})}
                  placeholder="Select a Slack workspace for alerts..."
                  maxSelections={1}
                />
              ) : (
                <Input
                  id={`target-${level}`}
                  value={target}
                  onChange={(e) => handleTargetChange(e.target.value)}
                  placeholder={getTargetPlaceholder()}
                  disabled={!method}
                  className={errors.target ? "border-destructive" : ""}
                />
              )}
              {method !== "SLACK" && errors.target && (
                <p className="text-sm text-destructive">{errors.target}</p>
              )}
            </div>
          </div>

          {!isLast && (
            <div className="space-y-2">
              <Label htmlFor={`wait-time-${level}`}>Wait Time (minutes)</Label>
              <div className="flex items-center gap-2">
                <Input
                  id={`wait-time-${level}`}
                  type="number"
                  min="1"
                  max="1440"
                  value={waitTimeMinutes || ""}
                  onChange={(e) =>
                    handleWaitTimeChange(parseInt(e.target.value) || 0)
                  }
                  placeholder="60"
                  className={`max-w-32 ${errors.waitTime ? "border-destructive" : ""}`}
                />
                <span className="text-sm text-muted-foreground">
                  before escalating to next level
                </span>
              </div>
              {errors.waitTime && (
                <p className="text-sm text-destructive">{errors.waitTime}</p>
              )}
            </div>
          )}

          {isLast && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                This is the final escalation level. No wait time needed.
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
