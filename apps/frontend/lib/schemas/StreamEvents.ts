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
  textDeltaEventSchema,
  errorEventSchema,
]);

/**
 * Type inference from Zod schema
 */
export type ValidatedStreamEvent = z.infer<typeof streamEventSchema>;
