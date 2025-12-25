'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Message, ChatRequest, ChatError, ThinkingStep } from '@/types/chat';
import { useChatContext } from '@/providers/ChatContextProvider';
import { streamEventSchema } from '@/lib/schemas/StreamEvents';
import { getToolDescription } from '@/lib/toolDescriptions';

interface UseChatOptions {
  onError?: (error: ChatError) => void;
}

export function useChat(options: UseChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messageCount, setMessageCount] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageTimestampsRef = useRef<number[]>([]);
  const conversationIdRef = useRef<string | undefined>(undefined);

  const { context } = useChatContext();
  const contextRef = useRef(context);

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
        const error = new Error(errorData.error || `HTTP ${response.status}`) as ChatError;

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
      const toolCalls: Map<string, string> = new Map(); // Track active tool calls
      const thinkingSteps: ThinkingStep[] = []; // Track thinking process steps
      let stepCounter = 0; // Auto-increment step numbers

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
              const parsed: unknown = JSON.parse(data);

              const validation = streamEventSchema.safeParse(parsed);

              if (!validation.success) {
                console.warn('Invalid stream event:', parsed, validation.error);
                continue;
              }

              const event = validation.data;

              if (event.type === 'text-delta') {
                assistantMessage += event.delta;

                // Update streaming message
                setMessages(prev => {
                  const withoutLast = prev.slice(0, -1);
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage?.role === 'assistant') {
                    return [...withoutLast, {
                      ...lastMessage,
                      content: assistantMessage,
                      thinkingSteps: thinkingSteps.length > 0 ? [...thinkingSteps] : undefined,
                    }];
                  }
                  return [...prev, {
                    role: 'assistant' as const,
                    content: assistantMessage,
                    thinkingSteps: thinkingSteps.length > 0 ? [...thinkingSteps] : undefined,
                    timestamp: new Date().toISOString(),
                  }];
                });
              } else if (event.type === 'tool-input-available') {
                if ('toolName' in event && 'toolCallId' in event && 'input' in event) {
                  // Create a new thinking step
                  stepCounter++;

                  const step: ThinkingStep = {
                    stepNumber: stepCounter,
                    toolName: event.toolName as string,
                    description: getToolDescription(event.toolName as string, event.input as Record<string, unknown>),
                    status: 'in-progress',
                    args: event.input as Record<string, unknown>,
                    startTime: new Date().toISOString(),
                  };

                  thinkingSteps.push(step);
                  toolCalls.set(event.toolCallId as string, event.toolName as string);
                }

                // Update message with thinking steps
                setMessages(prev => {
                  const withoutLast = prev.slice(0, -1);
                  const lastMessage = prev[prev.length - 1];
                  if (lastMessage?.role === 'assistant') {
                    return [...withoutLast, {
                      ...lastMessage,
                      content: assistantMessage,
                      thinkingSteps: [...thinkingSteps],
                    }];
                  }
                  return [...prev, {
                    role: 'assistant' as const,
                    content: assistantMessage,
                    thinkingSteps: [...thinkingSteps],
                    timestamp: new Date().toISOString(),
                  }];
                });
              } else if (event.type === 'tool-output-available') {
                if ('toolCallId' in event && 'output' in event) {
                  // Find the corresponding step by toolCallId
                  const toolName = toolCalls.get(event.toolCallId as string);
                  const step = thinkingSteps.find(s => s.toolName === toolName && !s.endTime);

                  if (step) {
                    step.status = 'completed';
                    step.result = event.output;
                    step.endTime = new Date().toISOString();

                    // Check if result indicates error
                    if (typeof event.output === 'object' && event.output && 'error' in event.output) {
                      step.status = 'failed';
                      step.error = (event.output as { error?: boolean; message?: string }).message || 'Tool execution failed';
                    }

                    // Update message with updated steps
                    setMessages(prev => {
                      const withoutLast = prev.slice(0, -1);
                      const lastMessage = prev[prev.length - 1];
                      if (lastMessage?.role === 'assistant') {
                        return [...withoutLast, {
                          ...lastMessage,
                          thinkingSteps: [...thinkingSteps],
                        }];
                      }
                      return prev;
                    });
                  }
                }
              } else if (event.type === 'start-step') {
                // Step starting - we'll create the thinking step on tool-input-available instead
              } else if (event.type === 'step-finish') {
                // Step finished - mark the most recent in-progress step as completed
                const inProgressStep = thinkingSteps.find(s => s.status === 'in-progress');
                if (inProgressStep && !inProgressStep.endTime) {
                  inProgressStep.status = 'completed';
                  inProgressStep.endTime = new Date().toISOString();

                  // Update message
                  setMessages(prev => {
                    const withoutLast = prev.slice(0, -1);
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.role === 'assistant') {
                      return [...withoutLast, {
                        ...lastMessage,
                        thinkingSteps: [...thinkingSteps],
                      }];
                    }
                    return prev;
                  });
                }
              } else if (event.type === 'start' || event.type === 'finish' || event.type === 'reasoning-start' || event.type === 'reasoning-delta' || event.type === 'reasoning-end' || event.type === 'text-start' || event.type === 'text-end' || event.type === 'tool-input-start' || event.type === 'tool-input-delta') {
                // Informational events - no action needed
              } else if (event.type === 'error' && 'error' in event) {
                console.error('Stream error:', event.error);
                throw new Error(event.error as string);
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
    retry: (failureCount, error: ChatError) => {
      // Don't retry rate limits or client errors
      if (error.status === 429 || (error.status && error.status >= 400 && error.status < 500)) {
        return false;
      }
      // Retry server errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    onError: (error: ChatError) => {
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
