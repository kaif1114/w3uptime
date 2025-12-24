'use client';

import { ThinkingStep } from '@/types/chat';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ThinkingStepsDisplayProps {
  steps: ThinkingStep[];
  isStreaming?: boolean;
}

export function ThinkingStepsDisplay({ steps, isStreaming = false }: ThinkingStepsDisplayProps) {
  console.log('[ThinkingStepsDisplay] Rendering with', steps.length, 'steps:', steps);

  if (steps.length === 0) return null;

  return (
    <div className="space-y-2 mb-3 p-3 bg-muted/50 rounded-lg border border-border/50">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        Thinking Process
      </div>

      {steps.map((step) => {
        const isActive = step.status === 'in-progress';
        const isCompleted = step.status === 'completed';
        const isFailed = step.status === 'failed';

        return (
          <div
            key={step.stepNumber}
            className={cn(
              'flex items-start gap-2 text-sm transition-all',
              isActive && 'text-primary',
              isCompleted && 'text-muted-foreground',
              isFailed && 'text-destructive'
            )}
          >
            {/* Status Icon */}
            {isActive && <Loader2 className="h-4 w-4 mt-0.5 animate-spin flex-shrink-0" />}
            {isCompleted && <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />}
            {isFailed && <XCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />}
            {step.status === 'pending' && <Circle className="h-4 w-4 mt-0.5 flex-shrink-0" />}

            {/* Step Description */}
            <div className="flex-1 min-w-0">
              <div className={cn(
                'font-medium',
                isActive && 'animate-pulse'
              )}>
                {step.description}
              </div>

              {/* Error Message */}
              {isFailed && step.error && (
                <div className="text-xs text-destructive mt-1">
                  {step.error}
                </div>
              )}

              {/* Duration for completed steps */}
              {isCompleted && step.endTime && (
                <div className="text-xs text-muted-foreground mt-0.5">
                  {calculateDuration(step.startTime, step.endTime)}
                </div>
              )}
            </div>

            {/* Step Number */}
            <div className="text-xs text-muted-foreground flex-shrink-0">
              {step.stepNumber}/{steps.length}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function calculateDuration(start: string, end: string): string {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}
