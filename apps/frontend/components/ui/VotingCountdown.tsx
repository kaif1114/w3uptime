'use client';

import { useEffect, useState } from 'react';
import { Progress } from '@/components/ui/progress';
import { Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VotingCountdownProps {
  votingEndsAt: Date;
  createdAt: Date;
  className?: string;
  compact?: boolean; // For inline/card layouts
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number; // Total seconds remaining
}

/**
 * Calculate time remaining until voting ends
 */
function calculateTimeRemaining(endDate: Date): TimeRemaining {
  const now = new Date().getTime();
  const end = new Date(endDate).getTime();
  const total = Math.max(0, Math.floor((end - now) / 1000));

  const days = Math.floor(total / (60 * 60 * 24));
  const hours = Math.floor((total % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((total % (60 * 60)) / 60);
  const seconds = total % 60;

  return { days, hours, minutes, seconds, total };
}

/**
 * Calculate voting period progress percentage
 */
function calculateProgress(createdAt: Date, endsAt: Date): number {
  const now = new Date().getTime();
  const start = new Date(createdAt).getTime();
  const end = new Date(endsAt).getTime();

  const totalDuration = end - start;
  const elapsed = now - start;

  const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  return progress;
}

export function VotingCountdown({
  votingEndsAt,
  createdAt,
  className,
  compact = false,
}: VotingCountdownProps) {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(
    calculateTimeRemaining(votingEndsAt)
  );
  const [progress, setProgress] = useState(calculateProgress(createdAt, votingEndsAt));

  useEffect(() => {
    // Update countdown every second
    const interval = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(votingEndsAt));
      setProgress(calculateProgress(createdAt, votingEndsAt));
    }, 1000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [votingEndsAt, createdAt]);

  const hasEnded = timeRemaining.total === 0;

  /**
   * Format time remaining for display
   * - Shows days if > 24h remaining
   * - Shows hours/minutes if < 24h
   * - Shows seconds if < 1h
   */
  const formatTimeRemaining = () => {
    if (hasEnded) return 'Voting Ended';

    const parts: string[] = [];

    if (timeRemaining.days > 0) {
      parts.push(`${timeRemaining.days}d`);
    }
    if (timeRemaining.hours > 0 || timeRemaining.days > 0) {
      parts.push(`${timeRemaining.hours}h`);
    }
    if (timeRemaining.days === 0) {
      parts.push(`${timeRemaining.minutes}m`);
    }
    if (timeRemaining.days === 0 && timeRemaining.hours === 0) {
      parts.push(`${timeRemaining.seconds}s`);
    }

    return parts.join(' ');
  };

  /**
   * Get urgency color based on time remaining
   */
  const getUrgencyColor = () => {
    if (hasEnded) return 'text-muted-foreground';
    if (timeRemaining.total < 60 * 60) return 'text-red-600'; // < 1 hour
    if (timeRemaining.total < 24 * 60 * 60) return 'text-orange-600'; // < 24 hours
    return 'text-blue-600';
  };

  if (compact) {
    // Compact mode for proposal cards
    return (
      <div className={cn('flex items-center justify-between text-sm', className)}>
        <div className="flex items-center space-x-1.5">
          {hasEnded ? (
            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-blue-600" />
          )}
          <span className="text-muted-foreground">
            {hasEnded ? 'Ended' : 'Ends in'}
          </span>
        </div>
        <span className={cn('font-mono font-semibold text-xs', getUrgencyColor())}>
          {formatTimeRemaining()}
        </span>
      </div>
    );
  }

  // Full mode for proposal detail page
  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {hasEnded ? (
            <XCircle className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Clock className="h-4 w-4 text-blue-600" />
          )}
          <span className="text-sm font-medium">
            {hasEnded ? 'Voting Period Ended' : 'Time Remaining'}
          </span>
        </div>
        <span className={cn('text-sm font-mono font-semibold', getUrgencyColor())}>
          {formatTimeRemaining()}
        </span>
      </div>

      {/* Progress bar */}
      <Progress
        value={progress}
        className={cn(
          'h-2',
          hasEnded && 'opacity-50'
        )}
      />

      {/* Date labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Started: {new Date(createdAt).toLocaleDateString()}</span>
        <span>Ends: {new Date(votingEndsAt).toLocaleDateString()}</span>
      </div>

      {/* Urgency warning */}
      {!hasEnded && timeRemaining.total < 24 * 60 * 60 && (
        <div className="text-xs text-orange-600 flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>
            {timeRemaining.total < 60 * 60
              ? 'Voting ends very soon!'
              : 'Less than 24 hours remaining'}
          </span>
        </div>
      )}
    </div>
  );
}
