# Tool/Action Calling Implementation - Step-by-Step Plan

## Overview
This document breaks down the implementation into small, sequential steps. Each step will be implemented and reviewed before moving to the next.

## Implementation Steps

### ✅ Step 1: Add Tool Type Definitions
**Goal:** Add TypeScript types for tool calls and results
**Files:** `apps/frontend/types/assistant.ts`
**Changes:**
- Add `ToolCall` interface
- Add `ToolResult` interface  
- Update `ChatResponse` to include `toolResults` and `toolsUsed`
**Estimated Time:** 5 minutes
**Dependencies:** None

---

### Step 2: Define Available Tools Constant
**Goal:** Create AVAILABLE_TOOLS array with tool definitions
**Files:** `apps/frontend/lib/assistant/prompt-builder.ts`
**Changes:**
- Add `AVAILABLE_TOOLS` constant with 5 tools:
  - get_all_monitors
  - get_monitor_data
  - get_escalation_policies
  - get_incidents
  - get_status_page_link
- Each tool includes: type, description, required fields, optional fields, returns description
**Estimated Time:** 10 minutes
**Dependencies:** Step 1

---

### Step 3: Update System Prompt for Tool Calling
**Goal:** Add instructions to LLM about when and how to use tools
**Files:** `apps/frontend/lib/assistant/prompt-builder.ts`
**Changes:**
- Update `buildSystemPrompt()` to include tool calling instructions
- Add format specification: `TOOL_CALLS: [{"type": "...", "data": {...}}]`
- Explain difference between tools (read) and actions (write)
- Provide examples of when to use tools
**Estimated Time:** 15 minutes
**Dependencies:** Step 2

---

### Step 4: Create Tool Handler Functions
**Goal:** Implement handler functions for each tool
**Files:** `apps/frontend/lib/assistant/tool-handlers.ts` (NEW)
**Changes:**
- Create file with 5 handler functions:
  - `getAllMonitors(userId: string)`
  - `getMonitorData(userId: string, monitorId: string)`
  - `getEscalationPolicies(userId: string)`
  - `getIncidents(userId: string, filters: {...})`
  - `getStatusPageLink(userId: string, statusPageId?: string)`
- Each function queries database and returns formatted data
**Estimated Time:** 30 minutes
**Dependencies:** Step 2

---

### Step 5: Create Tools API Route
**Goal:** Create API endpoint for executing tools
**Files:** `apps/frontend/app/api/assistant/tools/route.ts` (NEW)
**Changes:**
- Create POST handler with authentication
- Route tool calls to appropriate handler
- Return tool results or errors
- Handle validation and permissions
**Estimated Time:** 20 minutes
**Dependencies:** Step 4

---

### Step 6: Parse Tool Calls in Chat Route
**Goal:** Extract TOOL_CALLS from LLM response
**Files:** `apps/frontend/app/api/assistant/chat/route.ts`
**Changes:**
- Add parsing logic for `TOOL_CALLS:` marker (similar to SUGGESTED_ACTIONS)
- Extract tool calls array from LLM response
- Remove tool call block from visible message content
**Estimated Time:** 15 minutes
**Dependencies:** Step 3

---

### Step 7: Execute Tools and Include Results
**Goal:** Execute tools and feed results back to LLM
**Files:** `apps/frontend/app/api/assistant/chat/route.ts`
**Changes:**
- Call tools API route or handlers directly
- Collect tool results
- Include tool results in context for final LLM call
- Or: Make follow-up LLM call with tool results
**Estimated Time:** 25 minutes
**Dependencies:** Step 5, Step 6

---

### Step 8: Update Chat Response with Tool Info
**Goal:** Include tool execution info in API response
**Files:** `apps/frontend/app/api/assistant/chat/route.ts`
**Changes:**
- Add `toolResults` to ChatResponse
- Add `toolsUsed` array to ChatResponse
- Store tool info in message metadata
**Estimated Time:** 10 minutes
**Dependencies:** Step 7

---

### Step 9: Update UI to Display Tool Execution
**Goal:** Show tool execution status in chat UI
**Files:** `apps/frontend/components/assistant/chat-assistant.tsx`
**Changes:**
- Display "Fetching data..." when tools are executing
- Show tool results in collapsible section (optional)
- Indicate which tools were used
**Estimated Time:** 20 minutes
**Dependencies:** Step 8

---

### Step 10: Add New Write Actions (Optional)
**Goal:** Add update_monitor, create_status_page, update_status_page
**Files:** `apps/frontend/app/api/assistant/actions/route.ts`
**Files:** `apps/frontend/lib/assistant/prompt-builder.ts`
**Changes:**
- Add action definitions to ALLOWED_ACTIONS
- Add action specs to ACTION_SPECS
- Create handler functions
- Add to switch statement
**Estimated Time:** 30 minutes
**Dependencies:** None (can be done independently)

---

### Step 11: Testing and Refinement
**Goal:** Test complete flow and fix issues
**Files:** All modified files
**Changes:**
- Test tool calling flow end-to-end
- Test error handling
- Optimize performance
- Add caching if needed
**Estimated Time:** 30 minutes
**Dependencies:** All previous steps

---

## Current Status

**Next Step:** Step 1 - Add Tool Type Definitions

**Ready to proceed?** Waiting for approval to start Step 1.
