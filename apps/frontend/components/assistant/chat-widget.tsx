'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { ChatMessages } from './ChatMessages';
import { ChatInput } from './ChatInput';
import { useChat } from '@/hooks/useChat';
import { toast } from 'sonner';

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);

  const { messages, isStreaming, sendMessage, clearMessages } = useChat({
    onError: (error) => {
      toast.error(error.message || 'Failed to send message');
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
        className="w-full sm:w-[600px] p-0 flex flex-col h-full"
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

        <ChatMessages messages={messages} isStreaming={isStreaming} />

        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          placeholder="Ask about monitors, incidents, analytics..."
        />
      </SheetContent>
    </Sheet>
  );
}
