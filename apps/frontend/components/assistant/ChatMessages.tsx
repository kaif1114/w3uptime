'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { User, Bot, Loader2, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { ThinkingStepsDisplay } from './ThinkingStepsDisplay';

interface ChatMessagesProps {
  messages: Message[];
  isStreaming?: boolean;
  isLoading?: boolean;
}

export function ChatMessages({ messages, isStreaming = false, isLoading = false }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  // Loading state - show skeletons
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-16 w-3/4 rounded-lg" />
        </div>
        <div className="flex gap-3 justify-end">
          <Skeleton className="h-12 w-2/3 rounded-lg" />
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-20 w-4/5 rounded-lg" />
        </div>
      </div>
    );
  }

  // No messages - show placeholder
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            Start a conversation with the AI assistant
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Ask about monitors, incidents, analytics, and more</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.map((message, index) => {
        const isUser = message.role === 'user';
        const timestamp = message.timestamp ? format(new Date(message.timestamp), 'HH:mm') : '';

        return (
          <div
            key={index}
            className={cn(
              'flex gap-3',
              isUser ? 'justify-end' : 'justify-start'
            )}
          >
            {!isUser && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}

            <div
              className={cn(
                'max-w-[80%] rounded-lg px-4 py-2 space-y-1',
                isUser
                  ? 'bg-primary text-primary-foreground'
                  : message.content.startsWith('Error:')
                  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                  : 'bg-muted text-foreground'
              )}
            >
              {/* Show thinking steps for assistant messages */}
              {!isUser && message.thinkingSteps && message.thinkingSteps.length > 0 && (
                <ThinkingStepsDisplay
                  steps={message.thinkingSteps}
                  isStreaming={isStreaming && index === messages.length - 1}
                />
              )}

              <p className="text-sm whitespace-pre-wrap break-words">
                {message.content}
              </p>
              {timestamp && (
                <p className={cn(
                  'text-xs',
                  isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
                )}>
                  {timestamp}
                </p>
              )}
            </div>

            {isUser && (
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-secondary">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        );
      })}

      {/* Show loading spinner during initial streaming delay (before content or thinking steps appear) */}
      {isStreaming &&
       (messages.length === 0 || messages[messages.length - 1]?.role === 'user') && (
        <div className="flex gap-3 justify-start">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="bg-muted rounded-lg px-4 py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
