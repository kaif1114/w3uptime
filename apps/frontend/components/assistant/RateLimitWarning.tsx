'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock } from 'lucide-react';

interface RateLimitWarningProps {
  messageCount: number;
  limit?: number;
}

export function RateLimitWarning({ messageCount, limit = 20 }: RateLimitWarningProps) {
  const remaining = limit - messageCount;
  const shouldShow = messageCount >= 15 && messageCount < limit;

  if (!shouldShow) return null;

  return (
    <Alert className="mx-4 mb-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <Clock className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
        You have {remaining} message{remaining !== 1 ? 's' : ''} remaining this minute.
      </AlertDescription>
    </Alert>
  );
}
