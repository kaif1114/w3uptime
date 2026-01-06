'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare, AlertCircle, StopCircle } from 'lucide-react';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { RateLimitWarning } from './RateLimitWarning';
import { useChat } from '@/hooks/useChat';
import { toast } from 'sonner';
import { ChatError } from '@/types/chat';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const {
    messages,
    isStreaming,
    sendMessage,
    error,
    clearMessages,
    stopStreaming,
    messageCount
  } = useChat({
    onError: (error: ChatError) => {
      // Enhanced error toast
      if (error.status === 429) {
        toast.error('Rate limit reached', {
          description: `Please wait ${error.resetIn || 60} seconds before sending more messages.`,
          duration: 5000,
        });
      } else {
        toast.error('Failed to send message', {
          description: error.message || 'Please try again.',
        });
      }
    },
  });

  const handleSend = (message: string) => {
    sendMessage(message);
  };

  const handleClearChat = () => {
    if (window.confirm('Clear all messages? This will start a new conversation.')) {
      clearMessages();
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          aria-label="Open AI Assistant"
        >
          <MessageSquare className="h-6 w-6" />
        </Button>
      </SheetTrigger>

      <SheetContent
        side="right"
        className="w-full sm:w-[500px] md:w-[550px] lg:w-[600px] p-0 flex flex-col h-full"
      >
        <SheetHeader className="border-b p-4 flex-row items-center justify-between space-y-0">
          <SheetTitle className="text-lg font-semibold">AI Assistant</SheetTitle>
          <div className="flex gap-2">
            {messages.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearChat}
                disabled={isStreaming}
              >
                Clear
              </Button>
            )}
          </div>
        </SheetHeader>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mx-4 mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{(error as ChatError).message || 'An error occurred'}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Rate Limit Warning */}
        <RateLimitWarning messageCount={messageCount} />

        <ChatMessages messages={messages} isStreaming={isStreaming} />

        {/* Stop Button */}
        {isStreaming && (
          <div className="px-4 pb-2 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={stopStreaming}
              className="gap-2"
            >
              <StopCircle className="h-4 w-4" />
              Stop generating
            </Button>
          </div>
        )}

        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder="Ask about monitors, incidents, analytics..."
        />
      </SheetContent>
    </Sheet>
  );
}
