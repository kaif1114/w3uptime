'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { User, Bot, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface ChatMessagesProps {
  messages: Message[];
  isStreaming?: boolean;
}

export function ChatMessages({ messages, isStreaming = false }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-3">
          <Bot className="h-12 w-12 mx-auto text-muted-foreground" />
          <p className="text-muted-foreground">
            Ask me about your monitors, incidents, analytics, or validator stats.
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Try: "Show me my monitors"</p>
            <p>Or: "What's the uptime for this monitor?"</p>
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
                  : 'bg-muted text-foreground'
              )}
            >
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

      {isStreaming && (
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
