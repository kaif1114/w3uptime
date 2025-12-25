'use client';

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Send, Loader2 } from 'lucide-react';

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const MAX_MESSAGE_LENGTH = 2000;

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Ask me anything...'
}: ChatInputProps) {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;

    onSend(trimmed);
    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= MAX_MESSAGE_LENGTH) {
      setInput(value);

      // Auto-grow textarea
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }
  };

  const isOverLimit = input.length > MAX_MESSAGE_LENGTH;
  const canSend = input.trim().length > 0 && !disabled && !isOverLimit;

  return (
    <div className="border-t p-4 bg-background">
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[60px] max-h-[200px] resize-none pr-12"
            aria-label="Chat message input"
          />
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {input.length}/{MAX_MESSAGE_LENGTH}
          </div>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!canSend}
          size="icon"
          className="h-[60px] w-[60px]"
          aria-label="Send message"
        >
          {disabled ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
      {isOverLimit && (
        <p className="text-sm text-destructive mt-2">
          Message is too long. Please keep it under {MAX_MESSAGE_LENGTH} characters.
        </p>
      )}
    </div>
  );
}
