"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EscalationLevelItem } from "./escalation-level-item";
import { useCreateEscalationPolicy } from "@/hooks/useEscalationPolicies";
import { EscalationMethod } from "@/types/escalation-policy";
import { Plus, Save, AlertCircle } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const escalationPolicySchema = z.object({
  name: z
    .string()
    .min(1, "Policy name is required")
    .max(100, "Policy name cannot exceed 100 characters"),
  levels: z
    .array(
      z.object({
        id: z.string(),
        method: z.enum(["email", "slack", "webhook"]),
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
  waitTimeMinutes: number;
}

export function CreateEscalationPolicyForm() {
  const router = useRouter();
  const createMutation = useCreateEscalationPolicy();

  const [levels, setLevels] = useState<EscalationLevelForm[]>([
    { id: uuidv4(), method: "", target: "", waitTimeMinutes: 60 },
  ]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [policyName, setPolicyName] = useState("");
  const [nameError, setNameError] = useState("");

  const {
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
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
      setLevels([
        ...levels,
        {
          id: uuidv4(),
          method: "",
          target: "",
          waitTimeMinutes: 60,
        },
      ]);
    }
  };

  const removeLevel = (index: number) => {
    if (levels.length > 1) {
      setLevels(levels.filter((_, i) => i !== index));
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

      // Remove the dragged item
      newLevels.splice(draggedIndex, 1);

      // Insert it at the new position
      newLevels.splice(dropIndex, 0, draggedLevel);

      setLevels(newLevels);
    }

    setDraggedIndex(null);
  };

  const onSubmit = async () => {
    try {
      // Validate all fields
      const nameValidationError = validatePolicyName(policyName);
      if (nameValidationError) {
        setNameError(nameValidationError);
        return;
      }

      // Validate levels
      const validLevels = levels.filter(
        (level) =>
          level.method && level.target.trim() && level.waitTimeMinutes > 0
      );

      if (validLevels.length === 0) {
        return;
      }

      const formData = {
        name: policyName.trim(),
        levels: validLevels.map((level, index) => ({
          method: level.method as EscalationMethod,
          target: level.target.trim(),
          waitTimeMinutes:
            index === validLevels.length - 1 ? 0 : level.waitTimeMinutes, // Last level doesn't need wait time
        })),
      };

      await createMutation.mutateAsync(formData);
      router.push("/escalation-policies");
    } catch (error) {
      console.error("Failed to create escalation policy:", error);
    }
  };

  const isValid = () => {
    const hasValidName = policyName.trim() && !nameError;
    const hasValidLevels = levels.some(
      (level) =>
        level.method && level.target.trim() && level.waitTimeMinutes > 0
    );
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
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Policy Name */}
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

            {/* Escalation Levels */}
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
                    waitTimeMinutes={level.waitTimeMinutes}
                    onMethodChange={(method) => updateLevel(index, { method })}
                    onTargetChange={(target) => updateLevel(index, { target })}
                    onWaitTimeChange={(waitTimeMinutes) =>
                      updateLevel(index, { waitTimeMinutes })
                    }
                    onRemove={() => removeLevel(index)}
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    isDragging={draggedIndex === index}
                    isLast={index === levels.length - 1}
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

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isSubmitting || createMutation.isPending}
              >
                Cancel
              </Button>

              <Button
                type="submit"
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

            {/* Error Message */}
            {createMutation.error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive">
                  Failed to create escalation policy. Please try again.
                </p>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
