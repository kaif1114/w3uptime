import { z } from 'zod';

/**
 * Zod schema for text-delta stream events from AI SDK v6.0.3
 * Used for runtime validation of SSE stream data
 */
export const textDeltaEventSchema = z.looseObject({
  type: z.literal('text-delta'),
  id: z.string(),
  delta: z.string(),
});

/**
 * Zod schema for tool-call stream events
 */
export const toolCallEventSchema = z.looseObject({
  type: z.literal('tool-call'),
  toolCallId: z.string(),
  toolName: z.string(),
  args: z.record(z.string(), z.unknown()),
});

/**
 * Zod schema for tool-result stream events
 */
export const toolResultEventSchema = z.looseObject({
  type: z.literal('tool-result'),
  toolCallId: z.string(),
  toolName: z.string(),
  result: z.unknown(),
});

/**
 * Zod schema for stream start event
 */
export const startEventSchema = z.looseObject({
  type: z.literal('start'),
}); // Allow additional fields

/**
 * Zod schema for step start event
 */
export const startStepEventSchema = z.looseObject({
  type: z.literal('start-step'),
});

/**
 * Zod schema for reasoning start event
 */
export const reasoningStartEventSchema = z.looseObject({
  type: z.literal('reasoning-start'),
  id: z.string().optional(),
});

/**
 * Zod schema for reasoning delta event
 */
export const reasoningDeltaEventSchema = z.looseObject({
  type: z.literal('reasoning-delta'),
  delta: z.string(),
});

/**
 * Zod schema for reasoning end event
 */
export const reasoningEndEventSchema = z.looseObject({
  type: z.literal('reasoning-end'),
  id: z.string().optional(),
});

/**
 * Zod schema for tool input start event
 */
export const toolInputStartEventSchema = z.looseObject({
  type: z.literal('tool-input-start'),
  toolCallId: z.string(),
  toolName: z.string(),
});

/**
 * Zod schema for tool input delta event
 */
export const toolInputDeltaEventSchema = z.looseObject({
  type: z.literal('tool-input-delta'),
  toolCallId: z.string(),
  inputTextDelta: z.string(),
});

/**
 * Zod schema for tool input available event
 */
export const toolInputAvailableEventSchema = z.looseObject({
  type: z.literal('tool-input-available'),
  toolCallId: z.string(),
  toolName: z.string(),
  input: z.record(z.string(), z.unknown()),
});

/**
 * Zod schema for tool output available event
 */
export const toolOutputAvailableEventSchema = z.looseObject({
  type: z.literal('tool-output-available'),
  toolCallId: z.string(),
  output: z.unknown(),
});

/**
 * Zod schema for text start event
 */
export const textStartEventSchema = z.looseObject({
  type: z.literal('text-start'),
  id: z.string().optional(),
});

/**
 * Zod schema for step-finish stream events
 */
export const stepFinishEventSchema = z.looseObject({
  type: z.literal('step-finish'),
  stepNumber: z.number().optional(),
  finishReason: z.string().optional(),
});

/**
 * Zod schema for finish-step event (different from step-finish)
 */
export const finishStepEventSchema = z.looseObject({
  type: z.literal('finish-step'),
});

/**
 * Zod schema for finish event
 */
export const finishEventSchema = z.looseObject({
  type: z.literal('finish'),
});

/**
 * Zod schema for error stream events
 */
export const errorEventSchema = z.looseObject({
  type: z.literal('error'),
  error: z.string(),
});

/**
 * Simple, robust schema for all stream events
 * Accepts any event with a type field and allows all additional properties
 * This prevents complex union validation errors while maintaining type safety
 */
export const streamEventSchema = z.looseObject({
  type: z.string(),
});

/**
 * Type inference from Zod schema
 */
export type ValidatedStreamEvent = z.infer<typeof streamEventSchema>;
