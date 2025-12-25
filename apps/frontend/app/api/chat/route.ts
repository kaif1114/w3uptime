import { NextRequest } from 'next/server';
import { streamText, stepCountIs } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import { withAuth } from '@/lib/auth';
import { chatHistory } from '@/lib/ai/ChatHistory';
import { buildSystemPrompt } from '@/lib/ai/SystemPrompts';
import { createTools } from './tools';
import { Message } from '@/types/chat';
import { checkRateLimit } from '@/lib/ai/RateLimiter';

const chatRequestSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.uuid().optional(),
  context: z.object({
    pageType: z.enum([
      'monitor-detail',
      'dashboard',
      'incidents',
      'incident-detail',
      'validators',
      'escalation-policies',
    ]).nullable(),
    monitorId: z.uuid().optional(),
    incidentId: z.uuid().optional(),
    escalationPolicyId: z.uuid().optional(),
  }).optional(),
});

const model = process.env.OPENAI_MODEL || 'gpt-5';

export const POST = withAuth(async (req: NextRequest, user, session) => {
  try {
    // 1. Rate Limiting
    const rateLimitCheck = await checkRateLimit(user.id);
    if (!rateLimitCheck.allowed) {
      return Response.json(
        {
          error: 'Too many messages. Please wait a moment before sending more.',
          resetIn: rateLimitCheck.resetIn,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimitCheck.resetIn || 60) },
        }
      );
    }

    // 2. Validation
    const body = await req.json();
    const validation = chatRequestSchema.safeParse(body);
    if (!validation.success) {
      return Response.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }
    const { message, conversationId, context } = validation.data;

    // 3. Load/Create Conversation
    let conversation;
    let activeConversationId = conversationId;

    if (conversationId) {
      conversation = await chatHistory.loadConversation(user.id, conversationId);
      if (!conversation) {
        return Response.json(
          { error: 'Conversation not found' },
          { status: 404 }
        );
      }
    } else {
      activeConversationId = await chatHistory.createConversation(user.id);
      conversation = await chatHistory.loadConversation(user.id, activeConversationId);
      if (!conversation) {
        return Response.json(
          { error: 'Failed to initialize conversation' },
          { status: 500 }
        );
      }
    }

    // 4. Build Message History (AI SDK 5 format - no experimental_ prefixes)
    const systemPrompt = buildSystemPrompt({ context });
    const messageHistory = conversation.messages
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

    // 5. Create Tools with execution context
    const sessionId = req.cookies.get('sessionId')?.value;
    if (!sessionId) {
      return Response.json(
        { error: 'Session cookie missing' },
        { status: 401 }
      );
    }

    const tools = createTools({
      userId: user.id,
      sessionId: sessionId, // Use the actual cookie value, not the DB ID
      context,
    });

    // 6. Stream Response

    const result = streamText({
      model: openai(model),
      system: systemPrompt,
      messages: [...messageHistory, { role: 'user', content: message }],
      tools,
      stopWhen: stepCountIs(10), // Allow up to 5 steps for multi-turn tool calls
      onFinish: async ({ text, toolCalls, toolResults }) => {
        try {
          const userMessage: Message = {
            role: 'user',
            content: message,
            timestamp: new Date().toISOString(),
          };

          const assistantMessage: Message = {
            role: 'assistant',
            content: text,
            toolCalls: toolCalls?.map(tc => ({
              toolCallId: tc.toolCallId,
              toolName: tc.toolName,
              args: tc.input as Record<string, unknown>,
            })),
            toolResults: toolResults?.map(tr => ({
              toolCallId: tr.toolCallId,
              result: tr.output,
            })),
            timestamp: new Date().toISOString(),
          };
          console.log('userMessage', userMessage);
          console.log('toolCalls', toolCalls);
          console.log('toolResults', toolResults);
          console.log('assistantMessage', assistantMessage);

          await chatHistory.appendMessage(user.id, activeConversationId!, userMessage);
          await chatHistory.appendMessage(user.id, activeConversationId!, assistantMessage);
        } catch (error) {
          console.error('Failed to save conversation:', error);
          // Don't throw - allow stream to complete
        }
      },
    });

    return result.toUIMessageStreamResponse({
      headers: { 'X-Conversation-Id': activeConversationId! },
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
});
