"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCreateEscalationPolicy } from "@/hooks/useEscalationPolicies";
import { EscalationMethod } from "@/types/EscalationPolicy";
import { isApiError } from "@/types/error";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { EscalationLevelItem } from "./EscalationlevelItem";
import { SelectedSlackWorkspace } from "@/components/SlackWorkspaceSelector";

const escalationPolicySchema = z.object({
  name: z
    .string()
    .min(1, "Policy name is required")
    .max(100, "Policy name cannot exceed 100 characters"),
  levels: z
    .array(
      z.object({
        id: z.string(),
        method: z.enum(["EMAIL", "SLACK", "WEBHOOK"]),
        target: z.string().min(1, "Target is required"),
        waitTimeMinutes: z
          .number()
          .min(1, "Wait time must be at least 1 minute")
          .max(1440, "Wait time cannot exceed 24 hours"),
      })
    )
    .min(1, "At least one escalation level is required")
    .max(10, "Cannot have more than 10 escalation levels"),
});

type FormData = z.infer<typeof escalationPolicySchema>;

interface EscalationLevelForm {
  id: string;
  method: EscalationMethod | "";
  target: string;
  slackWorkspaces: SelectedSlackWorkspace[];
  waitTimeMinutes: number;
}

export function CreateEscalationPolicyForm() {
  const router = useRouter();
  const createMutation = useCreateEscalationPolicy();

  const [levels, setLevels] = useState<EscalationLevelForm[]>([
    { id: uuidv4(), method: "", target: "", slackWorkspaces: [], waitTimeMinutes: 60 },
  ]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [policyName, setPolicyName] = useState("");
  const [nameError, setNameError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [expandedIndex, setExpandedIndex] = useState<number>(0);

  const {
    formState: { isSubmitting },
  } = useForm<FormData>({
    // @ts-expect-error - Zod v4 compatibility issue with @hookform/resolvers v5.2.2
    resolver: zodResolver(escalationPolicySchema),
  });

  const validatePolicyName = (name: string) => {
    if (!name.trim()) {
      return "Policy name is required";
    }
    if (name.length > 100) {
      return "Policy name cannot exceed 100 characters";
    }
    return "";
  };

  const handleNameChange = (value: string) => {
    setPolicyName(value);
    setNameError(validatePolicyName(value));
  };

  const addLevel = () => {
    if (levels.length < 10) {
      const newLevel = {
        id: uuidv4(),
        method: "" as EscalationMethod | "",
        target: "",
        slackWorkspaces: [],
        waitTimeMinutes: 60,
      };
      setLevels([...levels, newLevel]);
      setExpandedIndex(levels.length); 
    }
  };

  const removeLevel = (index: number) => {
    if (levels.length > 1) {
      const updated = levels.filter((_, i) => i !== index);
      setLevels(updated);
      
      if (expandedIndex === index) {
        setExpandedIndex(Math.max(0, index - 1));
      } else if (expandedIndex > index) {
        setExpandedIndex(expandedIndex - 1);
      }
    }
  };

  const updateLevel = (
    index: number,
    updates: Partial<EscalationLevelForm>
  ) => {
    setLevels(
      levels.map((level, i) => (i === index ? { ...level, ...updates } : level))
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent, dropIndex: number) => {
    event.preventDefault();

    if (draggedIndex !== null && draggedIndex !== dropIndex) {
      const newLevels = [...levels];
      const draggedLevel = newLevels[draggedIndex];

      
      newLevels.splice(draggedIndex, 1);

      
      newLevels.splice(dropIndex, 0, draggedLevel);

      setLevels(newLevels);
    }

    setDraggedIndex(null);
  };

  const onSubmit = async () => {
    console.log("🔥 Form submitted!", { policyName, levels });
    console.log("🔥 isValid():", isValid());
    console.log("🔥 createMutation.isPending:", createMutation.isPending);
    try {
      
      const nameValidationError = validatePolicyName(policyName);
      if (nameValidationError) {
        setNameError(nameValidationError);
        return;
      }

      
      const validLevels = levels.filter(
        (level, index) => {
          const hasValidTarget = level.method === "SLACK" 
            ? level.slackWorkspaces.length > 0 
            : level.target.trim();
          return level.method &&
            hasValidTarget &&
            (level.waitTimeMinutes > 0 || index === levels.length - 1); 
        }
      );

      if (validLevels.length === 0) {
        console.error("No valid escalation levels");
        return;
      }

      const formData = {
        name: policyName.trim(),
        levels: validLevels.map((level, index) => ({
          method: level.method as EscalationMethod,
          target: level.target.trim(),
          slackChannels: level.method === "SLACK" ? level.slackWorkspaces : undefined,
          waitTimeMinutes:
            index === validLevels.length - 1 ? 0 : level.waitTimeMinutes, 
        })),
      };

      console.log("Submitting escalation policy:", formData);

      const response = await createMutation.mutateAsync(formData);
      console.log("Policy created successfully:", response);

      
      setSuccessMessage("Escalation policy created successfully!");

      
      setTimeout(() => {
        router.push("/escalation-policies");
      }, 1500);
    } catch (error: unknown) {
      console.error("Failed to create escalation policy:", error);

      
      if (isApiError(error) && error.details) {
        console.error("Validation errors:", error.details);
      }
    }
  };

  const isValid = () => {
    const hasValidName = policyName.trim() && !nameError;
    const hasValidLevels = levels.some(
      (level, index) => {
        const hasValidTarget = level.method === "SLACK" 
          ? level.slackWorkspaces.length > 0 
          : level.target.trim();
        return level.method &&
          hasValidTarget &&
          (level.waitTimeMinutes > 0 || index === levels.length - 1); 
      }
    );

    console.log("🔍 Validation check:", {
      policyName: policyName.trim(),
      nameError,
      hasValidName,
      levels,
      hasValidLevels,
      overall: hasValidName && hasValidLevels,
    });

    return hasValidName && hasValidLevels;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Create Escalation Policy
          </CardTitle>
          <CardDescription>
            Define how incidents should be escalated when they are not
            acknowledged. Add multiple levels and configure the wait time
            between escalations.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmit();
            }}
            className="space-y-6"
          >
            
            <div className="space-y-2">
              <Label htmlFor="policy-name">Policy Name</Label>
              <Input
                id="policy-name"
                value={policyName}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g., Production Alerts Escalation"
                className={nameError ? "border-destructive" : ""}
              />
              {nameError && (
                <p className="text-sm text-destructive">{nameError}</p>
              )}
            </div>

            <Separator />

            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Escalation Levels</h3>
                  <p className="text-sm text-muted-foreground">
                    Define the order and timing of your escalations
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLevel}
                  disabled={levels.length >= 10}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Level
                </Button>
              </div>

              <div className="space-y-4">
                {levels.map((level, index) => (
                  <EscalationLevelItem
                    key={level.id}
                    level={index + 1}
                    method={level.method}
                    target={level.target}
                    slackWorkspaces={level.slackWorkspaces}
                    waitTimeMinutes={level.waitTimeMinutes}
                    onMethodChange={(method) => updateLevel(index, { method })}
                    onTargetChange={(target) => updateLevel(index, { target })}
                    onSlackWorkspacesChange={(slackWorkspaces) => updateLevel(index, { slackWorkspaces })}
                    onWaitTimeChange={(waitTimeMinutes) =>
                      updateLevel(index, { waitTimeMinutes })
                    }
                    onRemove={() => removeLevel(index)}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    isDragging={draggedIndex === index}
                    isLast={index === levels.length - 1}
                    isExpanded={expandedIndex === index}
                    onToggleExpand={() => setExpandedIndex(index)}
                  />
                ))}
              </div>

              {levels.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-muted-foreground">
                        No escalation levels added
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={addLevel}
                        className="mt-2"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Level
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            
            <div className="flex items-center justify-between pt-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isSubmitting || createMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    console.log("🐛 Debug - Current State:", {
                      policyName,
                      levels,
                      isValid: isValid(),
                      nameError,
                      isPending: createMutation.isPending,
                    });
                  }}
                >
                  Debug
                </Button>
              </div>

              <Button
                type="submit"
                onClick={(e) => {
                  console.log("🚀 Create Policy button clicked!");
                  e.preventDefault();
                  onSubmit();
                }}
                disabled={
                  !isValid() || isSubmitting || createMutation.isPending
                }
                className="min-w-32"
              >
                {isSubmitting || createMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                    Creating...
                  </div>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Create Policy
                  </>
                )}
              </Button>
            </div>

            
            {successMessage && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-800 font-medium">
                  {successMessage}
                </p>
              </div>
            )}

            
            {createMutation.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium mb-1">
                  Failed to create escalation policy
                </p>
                <p className="text-sm text-destructive">
                  {createMutation.error.message || "Please try again."}
                </p>
                {createMutation.error.details && (
                  <div className="mt-2 text-xs text-destructive">
                    <details>
                      <summary className="cursor-pointer">Show details</summary>
                      <pre className="mt-1 whitespace-pre-wrap">
                        {JSON.stringify(createMutation.error.details, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
