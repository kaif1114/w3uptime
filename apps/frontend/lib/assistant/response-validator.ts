import { AssistantContext } from "./context-builder";

/**
 * Tool result type for validation.
 */
export type ToolResult = {
  toolType: string;
  result: unknown;
  error?: string;
};

/**
 * Validation result with warnings about potential issues.
 */
export type ValidationResult = {
  isValid: boolean;
  warnings: string[];
  /** IDs found in the response that aren't in context or tool results */
  suspiciousIds: string[];
  /** Whether the response claims data without tool calls */
  claimsDataWithoutTools: boolean;
};

/**
 * Validate an assistant response for potential hallucinations.
 *
 * Checks for:
 * - Made-up IDs (not in context or tool results)
 * - Claims about specific data without tool calls
 * - Suspicious patterns that indicate fabrication
 *
 * @param response - The assistant's response text
 * @param toolResults - Results from any tool calls made
 * @param context - The assistant context snapshot
 * @param toolsWereCalled - Whether any tools were called for this response
 */
export function validateResponse(
  response: string,
  toolResults: ToolResult[],
  context: AssistantContext,
  toolsWereCalled: boolean
): ValidationResult {
  const warnings: string[] = [];
  const suspiciousIds: string[] = [];

  // Collect all valid IDs from context and tool results
  const validIds = collectValidIds(context, toolResults);

  // Extract IDs mentioned in the response
  const mentionedIds = extractIds(response);

  // Check for IDs not in our valid set
  for (const id of mentionedIds) {
    if (!validIds.has(id)) {
      suspiciousIds.push(id);
    }
  }

  if (suspiciousIds.length > 0) {
    warnings.push(
      `Response contains IDs not found in context or tool results: ${suspiciousIds.join(", ")}`
    );
  }

  // Check for specific data claims without tool calls
  const claimsDataWithoutTools =
    !toolsWereCalled && containsSpecificDataClaims(response);

  if (claimsDataWithoutTools) {
    warnings.push(
      "Response contains specific data claims (uptime %, latency, incident details) without using tools"
    );
  }

  // Check for suspicious fabrication patterns
  const fabricationPatterns = detectFabricationPatterns(response);
  if (fabricationPatterns.length > 0) {
    warnings.push(...fabricationPatterns);
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suspiciousIds,
    claimsDataWithoutTools,
  };
}

/**
 * Collect all valid IDs from context and tool results.
 */
function collectValidIds(
  context: AssistantContext,
  toolResults: ToolResult[]
): Set<string> {
  const ids = new Set<string>();

  // IDs from context
  if (context.user?.id) {
    ids.add(context.user.id);
  }

  for (const monitor of context.summary.monitors) {
    ids.add(monitor.id);
  }

  for (const incident of context.summary.incidents) {
    ids.add(incident.id);
    if (incident.monitorId) {
      ids.add(incident.monitorId);
    }
  }

  // IDs from tool results
  for (const result of toolResults) {
    if (result.error || !result.result) continue;

    const extracted = extractIdsFromObject(result.result);
    for (const id of extracted) {
      ids.add(id);
    }
  }

  return ids;
}

/**
 * Extract IDs from a nested object structure.
 */
function extractIdsFromObject(obj: unknown): string[] {
  const ids: string[] = [];

  if (!obj || typeof obj !== "object") {
    return ids;
  }

  if (Array.isArray(obj)) {
    for (const item of obj) {
      ids.push(...extractIdsFromObject(item));
    }
    return ids;
  }

  const record = obj as Record<string, unknown>;

  // Look for common ID field names
  const idFields = [
    "id",
    "monitorId",
    "incidentId",
    "escalationPolicyId",
    "userId",
    "statusPageId",
    "escalationId",
  ];

  for (const field of idFields) {
    if (typeof record[field] === "string" && record[field]) {
      ids.push(record[field] as string);
    }
  }

  // Recurse into nested objects
  for (const value of Object.values(record)) {
    if (typeof value === "object" && value !== null) {
      ids.push(...extractIdsFromObject(value));
    }
  }

  return ids;
}

/**
 * Extract IDs mentioned in a text response.
 * Looks for common ID patterns (UUIDs, cuid, etc.)
 */
function extractIds(text: string): string[] {
  const ids: string[] = [];

  // UUID pattern
  const uuidPattern =
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
  const uuids = text.match(uuidPattern) || [];
  ids.push(...uuids);

  // CUID pattern (commonly used by Prisma)
  const cuidPattern = /c[a-z0-9]{24,}/gi;
  const cuids = text.match(cuidPattern) || [];
  ids.push(...cuids);

  // Generic alphanumeric ID pattern (at least 8 chars)
  // Be careful not to match normal words
  const genericIdPattern = /\b[a-z0-9]{20,}\b/gi;
  const genericIds = text.match(genericIdPattern) || [];
  ids.push(...genericIds);

  return [...new Set(ids)]; // Deduplicate
}

/**
 * Check if response contains specific data claims that would require tools.
 */
function containsSpecificDataClaims(response: string): boolean {
  const patterns = [
    // Uptime percentages
    /\d{1,3}(\.\d+)?%\s*(uptime|availability)/i,
    // Latency values
    /\d+\s*(ms|milliseconds?)\s*(latency|response)/i,
    // Specific incident counts
    /\d+\s*(incidents?|outages?|issues?)\s*(this|last|in the)/i,
    // Specific time durations
    /\d+\s*(minutes?|hours?|days?)\s*(of downtime|down)/i,
    // Last checked times
    /last checked\s*:?\s*\d/i,
  ];

  return patterns.some((pattern) => pattern.test(response));
}

/**
 * Detect patterns that suggest fabrication.
 */
function detectFabricationPatterns(response: string): string[] {
  const warnings: string[] = [];

  // Check for suspiciously round numbers
  if (/\b(100|99\.9|99\.99)%\s*uptime\b/i.test(response)) {
    // These are common but could be fabricated - flag for review
    // Don't add warning as these are valid values
  }

  // Check for generic placeholder-like responses
  const placeholderPatterns = [
    /your-[a-z]+-id/i,
    /example\.com/i,
    /test-monitor/i,
    /sample-/i,
  ];

  for (const pattern of placeholderPatterns) {
    if (pattern.test(response)) {
      warnings.push(
        `Response contains placeholder-like text: ${pattern.source}`
      );
    }
  }

  // Check for admissions of not having data followed by specific data
  if (
    /don't have|do not have|no data|not available/i.test(response) &&
    containsSpecificDataClaims(response)
  ) {
    warnings.push(
      "Response claims to not have data but also provides specific data"
    );
  }

  return warnings;
}

/**
 * Log validation warnings for monitoring.
 * In production, these could be sent to a logging service.
 */
export function logValidationWarnings(
  result: ValidationResult,
  responsePreview: string
): void {
  if (!result.isValid) {
    console.warn("[assistant validation] Potential hallucination detected:", {
      warnings: result.warnings,
      suspiciousIds: result.suspiciousIds,
      claimsDataWithoutTools: result.claimsDataWithoutTools,
      responsePreview: responsePreview.slice(0, 200),
    });
  }
}

