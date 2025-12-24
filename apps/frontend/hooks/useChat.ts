'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Message, ChatRequest } from '@/types/chat';
import { useChatContext } from '@/providers/ChatContextProvider';

interface UseChatOptions {
  onError?: (error: Error) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messageCount, setMessageCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageTimestampsRef = useRef<number[]>([]);
  const conversationIdRef = useRef<string | undefined>();
  const contextRef = useRef(useChatContext().context);

  const { context } = useChatContext();

  // Update refs when context changes
  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  // Update message count periodically
  useEffect(() => {
    const updateMessageCount = () => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      messageTimestampsRef.current = messageTimestampsRef.current.filter(ts => ts > oneMinuteAgo);
      setMessageCount(messageTimestampsRef.current.length);
    };

    updateMessageCount();
    const interval = setInterval(updateMessageCount, 1000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = useMutation({
    mutationFn: async (messageContent: string) => {
      // Track message timestamp for rate limiting
      messageTimestampsRef.current.push(Date.now());
      const now = Date.now();
      const oneMinuteAgo = now - 60000;
      messageTimestampsRef.current = messageTimestampsRef.current.filter(ts => ts > oneMinuteAgo);
      setMessageCount(messageTimestampsRef.current.length);

      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();
      setIsStreaming(true);

      // Add user message immediately
      const userMessage: Message = {
        role: 'user',
        content: messageContent,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, userMessage]);

      // Prepare request
      const requestBody: ChatRequest = {
        message: messageContent,
        conversationId: conversationIdRef.current,
        context: contextRef.current ?? undefined,
      };

      // Send request
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const error = new Error(errorData.error || `HTTP ${response.status}`) as any;

        // Attach metadata for error handling
        error.status = response.status;
        error.resetIn = errorData.resetIn;

        throw error;
      }

      // Get conversation ID from headers
      const newConversationId = response.headers.get('X-Conversation-Id');
      if (newConversationId) {
        setConversationId(newConversationId);
      }

      // Stream response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';

      if (!reader) {
        throw new Error('No response stream');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'text-delta') {
                assistantMessage += parsed.textDelta;
                // Update streaming message
                setMessages(prev => {
                  const withoutLast = prev.slice(0, -1);
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage?.role === 'assistant') {
                    return [...withoutLast, { ...lastMessage, content: assistantMessage }];
                  }
                  return [...prev, {
                    role: 'assistant' as const,
                    content: assistantMessage,
                    timestamp: new Date().toISOString(),
                  }];
                });
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      setIsStreaming(false);
      return { conversationId: newConversationId };
    },
    retry: (failureCount, error: any) => {
      // Don't retry rate limits or client errors
      if (error.status === 429 || (error.status >= 400 && error.status < 500)) {
        return false;
      }
      // Retry server errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    onError: (error: any) => {
      setIsStreaming(false);
      options.onError?.(error);

      // Add user-friendly error message to chat
      let errorMessage = 'Something went wrong. Please try again.';
      if (error.status === 429) {
        errorMessage = `Rate limit reached. Please wait ${error.resetIn || 60} seconds before sending more messages.`;
      } else if (error.message) {
        errorMessage = error.message;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date().toISOString(),
      }]);
    },
  });

  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(undefined);
  }, []);

  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsStreaming(false);
    }
  }, []);

  return {
    messages,
    isStreaming,
    conversationId,
    sendMessage: sendMessage.mutate,
    isLoading: sendMessage.isPending,
    error: sendMessage.error,
    clearMessages,
    stopStreaming,
    messageCount,
  };
}
