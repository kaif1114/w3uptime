"use client";

import SlackWorkspaceSelector from "@/components/SlackWorkspaceSelector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useEscalationPolicy,
  useUpdateEscalationPolicy,
} from "@/hooks/useEscalationPolicies";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  ArrowLeft,
  Edit,
  GripVertical,
  Mail,
  MessageSquare,
  Save,
  Webhook,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { useChatContext } from "@/providers/ChatContextProvider";
import { z } from "zod";

type SlackChannelData = {
  teamId: string;
  teamName: string;
  defaultChannelId: string;
  defaultChannelName: string;
} | {
  teamId: string;
  teamName: string;
  channelId: string;
  channelName: string;
};

interface EscalationPolicyDetailPageProps {
  policyId: string;
}

const methodIcons = {
  EMAIL: Mail,
  SLACK: MessageSquare,
  WEBHOOK: Webhook,
  email: Mail,
  slack: MessageSquare,
  webhook: Webhook,
};

const methodColors = {
  EMAIL: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  SLACK:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  WEBHOOK:
    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  slack:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  webhook:
    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
};


const escalationPolicySchema = z.object({
  name: z
    .string()
    .min(1, "Policy name is required")
    .max(100, "Policy name cannot exceed 100 characters"),
  levels: z
    .array(
      z.object({
        id: z.string().optional(),
        order: z.number(),
        method: z.enum(["EMAIL", "SLACK", "WEBHOOK"]),
        target: z.string(),
        slackChannels: z.array(z.object({
          teamId: z.string(),
          teamName: z.string(),
          channelId: z.string(),
          channelName: z.string(),
        })).optional(),
        waitTimeMinutes: z
          .number()
          .min(0, "Wait time cannot be negative")
          .max(1440, "Wait time cannot exceed 24 hours"),
      })
      .refine((level) => {
        if (level.method === "SLACK") {
          return level.slackChannels && level.slackChannels.length > 0;
        }
        return level.target && level.target.trim().length > 0;
      }, "Target or Slack channels are required")
    )
    .min(1, "At least one escalation level is required")
    .max(10, "Cannot have more than 10 escalation levels"),
});

type EscalationPolicyFormData = z.infer<typeof escalationPolicySchema>;

export function EscalationPolicyDetailPage({
  policyId,
}: EscalationPolicyDetailPageProps) {
  const { setContext } = useChatContext();
  const {
    data: policy,
    isLoading,
    error,
  } = useEscalationPolicy(policyId);
  const updateMutation = useUpdateEscalationPolicy();
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm<EscalationPolicyFormData>({
    // @ts-expect-error - Zod v4 compatibility issue with @hookform/resolvers v5.2.2
    resolver: zodResolver(escalationPolicySchema),
    defaultValues: {
      name: "",
      levels: [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "levels",
  });


  const watchedLevels = form.watch("levels");

  useEffect(() => {
    setContext({
      pageType: 'escalation-policies',
      escalationPolicyId: policyId,
    });

    return () => {
      setContext(null);
    };
  }, [policyId, setContext]);


  useEffect(() => {
    if (policy) {
      const formData = {
        name: policy.name,
        levels: policy.levels.map((level) => ({
          id: level.id,
          order: level.order,
          method: level.method as "EMAIL" | "SLACK" | "WEBHOOK",
          target: level.target || "",
          slackChannels: level.slackChannels || [],
          waitTimeMinutes: level.waitTimeMinutes,
        })),
      };
      form.reset(formData);
    }
  }, [policy, form]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    
    if (policy) {
      const formData = {
        name: policy.name,
        levels: policy.levels.map((level) => ({
          id: level.id,
          order: level.order,
          method: level.method as "EMAIL" | "SLACK" | "WEBHOOK",
          target: level.target || "",
          slackChannels: level.slackChannels || [],
          waitTimeMinutes: level.waitTimeMinutes,
        })),
      };
      form.reset(formData);
    }
  };

  const handleSave = async (data: EscalationPolicyFormData) => {
    try {
      await updateMutation.mutateAsync({ id: policyId, data });
      setIsEditing(false);
      
      alert("Escalation policy updated successfully!");
    } catch (error) {
      console.error("Error updating escalation policy:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to update escalation policy"
      );
    }
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    
    form.setValue("levels", updatedItems);
  };

  const addLevel = () => {
    const newOrder = fields.length + 1;
    append({
      order: newOrder,
      method: "EMAIL",
      target: "",
      slackChannels: [],
      waitTimeMinutes: 30,
    });
  };

  const removeLevel = (index: number) => {
    remove(index);
    
    const updatedLevels = form.getValues("levels").map((level, idx) => ({
      ...level,
      order: idx + 1,
    }));
    form.setValue("levels", updatedLevels);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted animate-pulse rounded" />
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <div className="h-6 w-32 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/escalation-policies">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Escalation Policy</h1>
            <p className="text-muted-foreground">
              View escalation policy details
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Error Loading Policy</h3>
              <p className="text-muted-foreground mb-4">
                {error.status === 404
                  ? "Escalation policy not found"
                  : "Failed to load escalation policy"}
              </p>
              <Button asChild>
                <Link href="/escalation-policies">Back to Policies</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!policy) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/escalation-policies">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Escalation Policy</h1>
            <p className="text-muted-foreground">
              View escalation policy details
            </p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Policy Not Found</h3>
              <p className="text-muted-foreground mb-4">
                The escalation policy you&apos;re looking for doesn&apos;t exist.
              </p>
              <Button asChild>
                <Link href="/escalation-policies">Back to Policies</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/escalation-policies">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Escalation Policy" : policy.name}
            </h1>
            <p className="text-muted-foreground">
              {isEditing
                ? "Modify the escalation policy settings and levels"
                : `Escalation policy with ${policy.levels.length} level${policy.levels.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={updateMutation.isPending}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(handleSave)}
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={handleEdit}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Policy
            </Button>
          )}
        </div>
      </div>

      <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
        
        <Card>
          <CardHeader>
            <CardTitle>Policy Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Policy Name</Label>
                {isEditing ? (
                  <Input
                    id="name"
                    {...form.register("name")}
                    placeholder="Enter policy name"
                  />
                ) : (
                  <p className="text-sm">{policy.name}</p>
                )}
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Created</Label>
                <p className="text-sm">
                  {new Date(policy.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Last Updated</Label>
                <p className="text-sm">
                  {new Date(policy.updatedAt).toLocaleDateString()}
                </p>
              </div>
              <div className="space-y-2">
                <Label>Total Levels</Label>
                <p className="text-sm">{policy.levels.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Escalation Levels</CardTitle>
              {isEditing && (
                <Button type="button" variant="outline" onClick={addLevel}>
                  Add Level
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="levels">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-4"
                    >
                      {fields.map((field, index) => {
                        const currentLevel = watchedLevels[index];
                        return (
                          <Draggable
                            key={field.id}
                            draggableId={field.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-4 p-4 border rounded-lg ${
                                  snapshot.isDragging ? "bg-muted/50" : ""
                                }`}
                              >
                                <div
                                  {...provided.dragHandleProps}
                                  className="cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                                </div>

                                <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full">
                                  <span className="text-sm font-medium">
                                    {index + 1}
                                  </span>
                                </div>

                                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="space-y-2">
                                    <Label>Method</Label>
                                    <Select
                                      value={
                                        currentLevel?.method || field.method
                                      }
                                      onValueChange={(value) => {
                                        form.setValue(
                                          `levels.${index}.method`,
                                          value as "EMAIL" | "SLACK" | "WEBHOOK"
                                        );
                                        
                                        form.trigger(`levels.${index}.method`);
                                      }}
                                    >
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="EMAIL">
                                          Email
                                        </SelectItem>
                                        <SelectItem value="SLACK">
                                          Slack
                                        </SelectItem>
                                        <SelectItem value="WEBHOOK">
                                          Webhook
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>
                                      {currentLevel?.method === "SLACK" 
                                        ? "Slack Workspace" 
                                        : "Target"}
                                    </Label>
                                    {currentLevel?.method === "SLACK" ? (
                                      <SlackWorkspaceSelector
                                        selectedWorkspaces={
                                          currentLevel?.slackChannels?.map((channel: SlackChannelData) => ({
                                            teamId: channel.teamId,
                                            teamName: channel.teamName,
                                            defaultChannelId: 'defaultChannelId' in channel ? channel.defaultChannelId : channel.channelId,
                                            defaultChannelName: 'defaultChannelName' in channel ? channel.defaultChannelName : channel.channelName,
                                          })) || []
                                        }
                                        onWorkspacesChange={(workspaces) => {
                                          
                                          const formattedWorkspaces = workspaces.map(workspace => ({
                                            teamId: workspace.teamId,
                                            teamName: workspace.teamName,
                                            channelId: workspace.defaultChannelId,
                                            channelName: workspace.defaultChannelName,
                                          }));
                                          form.setValue(
                                            `levels.${index}.slackChannels`,
                                            formattedWorkspaces
                                          );
                                          form.trigger(`levels.${index}.slackChannels`);
                                        }}
                                        placeholder="Select a Slack workspace for alerts..."
                                        maxSelections={1}
                                      />
                                    ) : (
                                      <Input
                                        {...form.register(
                                          `levels.${index}.target`
                                        )}
                                        placeholder={
                                          currentLevel?.method === "EMAIL" 
                                            ? "Email address" 
                                            : "Webhook URL"
                                        }
                                        onChange={(e) => {
                                          form.setValue(
                                            `levels.${index}.target`,
                                            e.target.value
                                          );
                                          form.trigger(`levels.${index}.target`);
                                        }}
                                      />
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Wait Time (minutes)</Label>
                                    <Input
                                      type="number"
                                      {...form.register(
                                        `levels.${index}.waitTimeMinutes`,
                                        {
                                          valueAsNumber: true,
                                        }
                                      )}
                                      min="0"
                                      max="1440"
                                      onChange={(e) => {
                                        form.setValue(
                                          `levels.${index}.waitTimeMinutes`,
                                          parseInt(e.target.value) || 0
                                        );
                                        form.trigger(
                                          `levels.${index}.waitTimeMinutes`
                                        );
                                      }}
                                    />
                                  </div>
                                </div>

                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeLevel(index)}
                                  className="text-destructive hover:text-destructive"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            ) : (
              <div className="space-y-4">
                {policy.levels.map((level) => {
                  const Icon =
                    methodIcons[level.method as keyof typeof methodIcons];
                  return (
                    <div
                      key={level.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center justify-center w-8 h-8 bg-muted rounded-full">
                          <span className="text-sm font-medium">
                            {level.order}
                          </span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="secondary"
                              className={
                                methodColors[
                                  level.method as keyof typeof methodColors
                                ]
                              }
                            >
                              {Icon && <Icon className="h-3 w-3 mr-1" />}
                              {level.method}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Wait {level.waitTimeMinutes} minutes
                            </span>
                          </div>
                          {level.method === "SLACK" && level.slackChannels && level.slackChannels.length > 0 ? (
                            <div className="space-y-1">
                              {level.slackChannels.map((channel: SlackChannelData, idx: number) => (
                                <div key={idx} className="text-sm font-medium">
                                  <span className="text-muted-foreground">{channel.teamName}</span>
                                  <span className="mx-1">•</span>
                                  <span>#{('defaultChannelName' in channel) ? channel.defaultChannelName : channel.channelName}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm font-medium">{level.target}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
