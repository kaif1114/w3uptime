'use client';

import { ThinkingStep } from '@/types/chat';
import { Loader2, XCircle } from 'lucide-react';

interface ThinkingStepsDisplayProps {
  steps: ThinkingStep[];
  isStreaming?: boolean;
}

export function ThinkingStepsDisplay({ steps, isStreaming = false }: ThinkingStepsDisplayProps) {
  if (steps.length === 0) {
    return null;
  }

  // Find the current step to display (in-progress step, or last step if all completed)
  const currentStep = steps.find(s => s.status === 'in-progress') || steps[steps.length - 1];

  if (!currentStep) {
    return null;
  }

  const isFailed = currentStep.status === 'failed';

  return (
    <div className="flex items-center gap-2 mb-2 p-2 text-sm text-muted-foreground">
      {/* Spinner icon for active steps, X icon for failed steps */}
      {isFailed ? (
        <XCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
      ) : (
        <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
      )}

      {/* Step description */}
      <span className={isFailed ? 'text-destructive' : ''}>
        {currentStep.description}
      </span>

      {/* Error message if failed */}
      {isFailed && currentStep.error && (
        <span className="text-xs text-destructive ml-2">
          - {currentStep.error}
        </span>
      )}
    </div>
  );
}
