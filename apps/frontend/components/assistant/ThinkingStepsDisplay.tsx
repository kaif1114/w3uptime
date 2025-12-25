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

  // Only show thinking steps if there's an active in-progress step or still streaming
  const currentStep = steps.find(s => s.status === 'in-progress');

  // If no in-progress step and not streaming, hide the indicator
  if (!currentStep && !isStreaming) {
    return null;
  }

  // If streaming but no in-progress step, show the last step temporarily
  const displayStep = currentStep || steps[steps.length - 1];

  if (!displayStep) {
    return null;
  }

  const isFailed = displayStep.status === 'failed';

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
        {displayStep.description}
      </span>

      {/* Error message if failed */}
      {isFailed && displayStep.error && (
        <span className="text-xs text-destructive ml-2">
          - {displayStep.error}
        </span>
      )}
    </div>
  );
}
