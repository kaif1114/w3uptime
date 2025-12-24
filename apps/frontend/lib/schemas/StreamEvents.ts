import { z } from 'zod';

/**
 * Zod schema for text-delta stream events from AI SDK v6.0.3
 * Used for runtime validation of SSE stream data
 */
export const textDeltaEventSchema = z.object({
  type: z.literal('text-delta'),
  id: z.string(),
  delta: z.string(),
});

/**
 * Zod schema for tool-call stream events
 */
export const toolCallEventSchema = z.object({
  type: z.literal('tool-call'),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.unknown()),
});

/**
 * Zod schema for tool-result stream events
 */
export const toolResultEventSchema = z.object({
  type: z.literal('tool-result'),
  toolCallId: z.string(),
  toolName: z.string(),
  result: z.unknown(),
});

/**
 * Zod schema for stream start event
 */
export const startEventSchema = z.object({
  type: z.literal('start'),
}).passthrough(); // Allow additional fields

/**
 * Zod schema for step start event
 */
export const startStepEventSchema = z.object({
  type: z.literal('start-step'),
}).passthrough();

/**
 * Zod schema for reasoning start event
 */
export const reasoningStartEventSchema = z.object({
  type: z.literal('reasoning-start'),
  id: z.string().optional(),
}).passthrough();

/**
 * Zod schema for reasoning delta event
 */
export const reasoningDeltaEventSchema = z.object({
  type: z.literal('reasoning-delta'),
  delta: z.string(),
}).passthrough();

/**
 * Zod schema for reasoning end event
 */
export const reasoningEndEventSchema = z.object({
  type: z.literal('reasoning-end'),
  id: z.string().optional(),
}).passthrough();

/**
 * Zod schema for tool input start event
 */
export const toolInputStartEventSchema = z.object({
  type: z.literal('tool-input-start'),
  toolCallId: z.string(),
  toolName: z.string(),
}).passthrough();

/**
 * Zod schema for tool input delta event
 */
export const toolInputDeltaEventSchema = z.object({
  type: z.literal('tool-input-delta'),
  toolCallId: z.string(),
  inputTextDelta: z.string(),
}).passthrough();

/**
 * Zod schema for tool input available event
 */
export const toolInputAvailableEventSchema = z.object({
  type: z.literal('tool-input-available'),
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.record(z.unknown()),
}).passthrough();

/**
 * Zod schema for step-finish stream events
 */
export const stepFinishEventSchema = z.object({
  type: z.literal('step-finish'),
  stepNumber: z.number().optional(),
  finishReason: z.string().optional(),
}).passthrough();

/**
 * Zod schema for finish event
 */
export const finishEventSchema = z.object({
  type: z.literal('finish'),
}).passthrough();

/**
 * Zod schema for error stream events
 */
export const errorEventSchema = z.object({
  type: z.literal('error'),
  error: z.string(),
});

/**
 * Discriminated union schema for all stream events
 * Enables type-safe exhaustive checking with switch statements
 */
export const streamEventSchema = z.discriminatedUnion('type', [
  startEventSchema,
  startStepEventSchema,
  textDeltaEventSchema,
  toolCallEventSchema,
  toolResultEventSchema,
  reasoningStartEventSchema,
  reasoningDeltaEventSchema,
  reasoningEndEventSchema,
  toolInputStartEventSchema,
  toolInputDeltaEventSchema,
  toolInputAvailableEventSchema,
  stepFinishEventSchema,
  finishEventSchema,
  errorEventSchema,
]);

/**
 * Type inference from Zod schema
 */
export type ValidatedStreamEvent = z.infer<typeof streamEventSchema>;
