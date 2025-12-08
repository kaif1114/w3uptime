# LLM-Based Assistant Module - Implementation Plan

## Table of Contents

1. [Overview](#overview)
2. [LLM Capabilities & Use Cases](#llm-capabilities--use-cases)
3. [Architecture & Components](#architecture--components)
4. [Database Schema](#database-schema)
5. [API Routes](#api-routes)
6. [Server Actions](#server-actions)
7. [Frontend Components](#frontend-components)
8. [Context Management](#context-management)
9. [LLM Integration Options](#llm-integration-options)
10. [Implementation Phases](#implementation-phases)
11. [Integration Points](#integration-points)

---

## 1. Overview

The LLM-Based Assistant module provides real-time, context-aware guidance to users about their monitoring infrastructure. It helps users understand incidents, optimize monitor configurations, interpret analytics, and get actionable recommendations.

### Key Features

- **Conversational Interface**: Chat-based interaction for natural queries
- **Context Awareness**: Understands current user state (monitors, incidents, analytics)
- **Actionable Suggestions**: Provides specific recommendations based on data
- **Multi-modal Support**: Can analyze incidents, monitors, analytics, and escalations
- **Persistent Context**: Maintains conversation history per user

---

## 2. LLM Capabilities & Use Cases

### 2.1 Incident Analysis & Recommendations

**What LLM Can Do:**

- Analyze incident patterns and root causes
- Suggest resolution steps based on incident type
- Identify recurring issues across monitors
- Recommend escalation policy adjustments
- Provide post-incident improvement suggestions

**Example Queries:**

- "Why did my monitor go down?"
- "What should I do about this incident?"
- "Are there patterns in my recent incidents?"
- "How can I prevent this from happening again?"

### 2.2 Monitor Configuration & Optimization

**What LLM Can Do:**

- Suggest optimal check intervals based on usage patterns
- Recommend timeout values based on historical latency
- Advise on expected status codes configuration
- Identify monitors with suboptimal settings
- Suggest monitor grouping strategies

**Example Queries:**

- "What's the best check interval for my API?"
- "Should I change my monitor timeout?"
- "Which monitors need attention?"
- "How can I optimize my monitoring setup?"

### 2.3 Analytics Interpretation & Insights

**What LLM Can Do:**

- Explain analytics data in plain language
- Identify performance trends and anomalies
- Compare regional performance differences
- Interpret health scores and recommendations
- Suggest optimizations based on patterns

**Example Queries:**

- "What does my uptime data mean?"
- "Why is latency higher in certain regions?"
- "What's causing my performance issues?"
- "How does this week compare to last week?"

### 2.4 Alert & Escalation Guidance

**What LLM Can Do:**

- Suggest alert thresholds based on historical data
- Recommend escalation policy configurations
- Explain alert patterns and frequencies
- Suggest notification channel optimizations

**Example Queries:**

- "Should I adjust my alert thresholds?"
- "How should I configure my escalation policy?"
- "Why am I getting too many alerts?"

### 2.5 General Platform Guidance

**What LLM Can Do:**

- Explain platform features and capabilities
- Guide users through setup processes
- Answer questions about DePIN architecture
- Provide best practices for monitoring

**Example Queries:**

- "How does the DePIN network work?"
- "How do I set up a new monitor?"
- "What's the difference between monitors and status pages?"

---

## 3. Architecture & Components

### 3.1 System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Chat Interface Component                                    │
│  ├── ChatWindow (UI)                                         │
│  ├── MessageList (Display messages)                          │
│  ├── InputArea (User input)                                  │
│  └── ContextIndicator (Shows active context)                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Layer                                 │
├─────────────────────────────────────────────────────────────┤
│  /api/assistant/chat (POST)                                 │
│  ├── Validates request                                       │
│  ├── Retrieves context                                       │
│  ├── Calls LLM service                                       │
│  └── Saves conversation                                      │
│                                                              │
│  /api/assistant/context (GET)                               │
│  ├── Fetches available context                              │
│  └── Returns monitors, incidents, analytics                 │
│                                                              │
│  /api/assistant/history (GET)                               │
│  ├── Fetches conversation history                           │
│  └── Returns paginated messages                             │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                             │
├─────────────────────────────────────────────────────────────┤
│  lib/assistant/                                             │
│  ├── context-builder.ts (Builds context from user data)     │
│  ├── llm-service.ts (LLM API integration)                   │
│  ├── prompt-builder.ts (Constructs prompts)                  │
│  └── response-parser.ts (Parses LLM responses)              │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
├─────────────────────────────────────────────────────────────┤
│  Conversation (New table)                                    │
│  ConversationMessage (New table)                            │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Component Structure

```
components/
├── assistant/
│   ├── chat-assistant.tsx          # Main chat component
│   ├── chat-window.tsx              # Chat UI container
│   ├── message-list.tsx             # Message display
│   ├── message-bubble.tsx           # Individual message
│   ├── chat-input.tsx               # Input field with send
│   ├── context-selector.tsx        # Select active context
│   ├── suggestion-chips.tsx        # Quick action buttons
│   └── assistant-button.tsx         # Floating action button
```

---

## 4. Database Schema

### 4.1 New Tables

```prisma
model Conversation {
  id          String              @id @default(uuid())
  userId      String
  title       String?             // Auto-generated from first message
  contextType ConversationContext? // MONITOR, INCIDENT, ANALYTICS, GENERAL
  contextId   String?              // ID of monitor/incident if context-specific
  createdAt   DateTime            @default(now())
  updatedAt   DateTime            @updatedAt
  user        User                @relation(fields: [userId], references: [id])
  messages    ConversationMessage[]

  @@index([userId])
  @@index([userId, createdAt])
  @@index([contextType, contextId])
}

model ConversationMessage {
  id             String            @id @default(uuid())
  conversationId String
  role           MessageRole       // USER, ASSISTANT, SYSTEM
  content        String
  metadata       Json?             // Store context used, actions suggested, etc.
  createdAt      DateTime          @default(now())
  conversation   Conversation       @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId, createdAt])
}

enum ConversationContext {
  GENERAL
  MONITOR
  INCIDENT
  ANALYTICS
  ALERT
  ESCALATION
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}
```

### 4.2 Schema Updates

Add to `User` model:

```prisma
conversations Conversation[]
```

---

## 5. API Routes

### 5.1 POST `/api/assistant/chat`

**Purpose**: Send user message and get LLM response

**Request Body:**

```typescript
{
  message: string;
  conversationId?: string;  // If continuing existing conversation
  contextType?: ConversationContext;
  contextId?: string;       // Monitor ID, Incident ID, etc.
}
```

**Response:**

```typescript
{
  message: {
    id: string;
    role: "ASSISTANT";
    content: string;
    metadata?: {
      suggestedActions?: Array<{
        type: string;
        label: string;
        action: string;
      }>;
      contextUsed?: {
        monitors?: string[];
        incidents?: string[];
        analytics?: string[];
      };
    };
    createdAt: string;
  };
  conversationId: string;
  suggestions?: string[];  // Follow-up question suggestions
}
```

**Implementation Flow:**

1. Authenticate user
2. Retrieve or create conversation
3. Build context from user's data (monitors, incidents, analytics)
4. Construct prompt with context
5. Call LLM service
6. Parse response
7. Save message to database
8. Return response

### 5.2 GET `/api/assistant/context`

**Purpose**: Get available context for the user

**Query Parameters:**

- `type`: `monitor` | `incident` | `analytics` | `all`

**Response:**

```typescript
{
  monitors: Array<{
    id: string;
    name: string;
    url: string;
    status: string;
    hasOngoingIncident: boolean;
  }>;
  incidents: Array<{
    id: string;
    title: string;
    status: string;
    monitorId: string;
    monitorName: string;
  }>;
  analytics: Array<{
    monitorId: string;
    monitorName: string;
    healthScore?: number;
    recentInsights?: string[];
  }>;
}
```

### 5.3 GET `/api/assistant/history`

**Purpose**: Get conversation history

**Query Parameters:**

- `conversationId`: string (optional, if not provided, returns all conversations)
- `limit`: number (default: 50)
- `offset`: number (default: 0)

**Response:**

```typescript
{
  conversations?: Array<{
    id: string;
    title: string;
    contextType: string;
    contextId?: string;
    lastMessageAt: string;
    messageCount: number;
  }>;
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
  }>;
  total: number;
}
```

### 5.4 DELETE `/api/assistant/conversations/[id]`

**Purpose**: Delete a conversation

**Response:**

```typescript
{
  success: boolean;
  message: string;
}
```

### 5.5 POST `/api/assistant/actions`

**Purpose**: Execute suggested actions (e.g., update monitor, acknowledge incident)

**Request Body:**

```typescript
{
  actionType: string; // "update_monitor", "acknowledge_incident", etc.
  actionData: Record<string, unknown>;
  conversationId: string;
  messageId: string; // The message that suggested this action
}
```

**Response:**

```typescript
{
  success: boolean;
  result?: unknown;
  error?: string;
}
```

---

## 6. Server Actions

### 6.1 `lib/actions/assistant.ts`

**Functions:**

```typescript
// Get conversation history
export async function getConversationHistory(
  conversationId?: string,
  limit?: number
): Promise<ConversationHistory>;

// Create new conversation
export async function createConversation(
  contextType?: ConversationContext,
  contextId?: string
): Promise<Conversation>;

// Get available context
export async function getAssistantContext(
  userId: string
): Promise<AssistantContext>;

// Delete conversation
export async function deleteConversation(
  conversationId: string
): Promise<boolean>;
```

---

## 7. Frontend Components

### 7.1 Chat Assistant Component (`components/assistant/chat-assistant.tsx`)

**Features:**

- Floating action button (bottom-right corner)
- Expandable chat window
- Context selector
- Message history
- Input with send button
- Loading states
- Error handling

**Props:**

```typescript
interface ChatAssistantProps {
  defaultContext?: {
    type: ConversationContext;
    id?: string;
  };
  position?: "bottom-right" | "bottom-left" | "inline";
  minimized?: boolean;
}
```

### 7.2 Chat Window (`components/assistant/chat-window.tsx`)

**Features:**

- Scrollable message list
- Auto-scroll to bottom
- Message grouping by time
- Typing indicators
- Context indicator badge

### 7.3 Message Bubble (`components/assistant/message-bubble.tsx`)

**Features:**

- Different styles for user/assistant messages
- Markdown rendering for assistant messages
- Action buttons for suggested actions
- Timestamp display
- Copy message button

### 7.4 Chat Input (`components/assistant/chat-input.tsx`)

**Features:**

- Textarea with auto-resize
- Send button (keyboard shortcut: Enter)
- Character counter (optional)
- Placeholder with suggestions
- Disabled state while processing

### 7.5 Context Selector (`components/assistant/context-selector.tsx`)

**Features:**

- Dropdown to select active context
- Shows current context badge
- Quick switch between monitors/incidents
- "General" option for platform questions

### 7.6 Suggestion Chips (`components/assistant/suggestion-chips.tsx`)

**Features:**

- Display suggested follow-up questions
- Clickable chips that auto-fill input
- Context-aware suggestions
- Fade in animation

### 7.7 Layout Integration

**Option 1: Floating Button (Recommended)**

- Add to root layout (`app/layout.tsx`)
- Always accessible
- Minimizable

**Option 2: Sidebar Integration**

- Add to `AppSidebar` component
- Persistent chat panel
- Better for desktop

**Option 3: Page-Specific**

- Add to specific pages (e.g., monitor details, incident page)
- Context-aware by default

**Recommended: Combination**

- Floating button in root layout (always available)
- Context-aware when on specific pages (monitor/incident details)

---

## 8. Context Management

### 8.1 Context Builder (`lib/assistant/context-builder.ts`)

**Purpose**: Builds comprehensive context from user's data

**Context Sources:**

1. **Monitor Context**
   - Monitor details (name, URL, status, config)
   - Recent incidents
   - Current analytics
   - Historical performance

2. **Incident Context**
   - Incident details (title, status, cause)
   - Timeline events
   - Related monitor info
   - Escalation status
   - Similar past incidents

3. **Analytics Context**
   - Current metrics (uptime, latency, health score)
   - Regional performance
   - Trends and patterns
   - Performance insights
   - Recommendations

4. **General Context**
   - User's monitors list
   - Recent incidents
   - Overall system health
   - Platform features

**Context Format:**

```typescript
interface AssistantContext {
  user: {
    id: string;
    walletAddress: string;
    monitorCount: number;
  };
  monitors?: Array<{
    id: string;
    name: string;
    url: string;
    status: string;
    lastCheckedAt?: string;
    uptime?: number;
    avgLatency?: number;
  }>;
  incidents?: Array<{
    id: string;
    title: string;
    status: string;
    cause: string;
    createdAt: string;
    monitorId: string;
    monitorName: string;
  }>;
  analytics?: Array<{
    monitorId: string;
    monitorName: string;
    healthScore: number;
    uptime: number;
    avgLatency: number;
    insights: string[];
  }>;
  currentContext?: {
    type: ConversationContext;
    id?: string;
    details?: unknown;
  };
}
```

### 8.2 Prompt Builder (`lib/assistant/prompt-builder.ts`)

**Purpose**: Constructs prompts for LLM with context

**Prompt Structure:**

```
System Prompt:
You are an expert monitoring assistant for W3Uptime, a DePIN-based monitoring platform.
Your role is to help users understand their monitoring data, resolve incidents, and optimize their setup.

User Context:
[Formatted context data]

Conversation History:
[Previous messages]

Current Message:
[User's question]

Instructions:
- Provide clear, actionable advice
- Reference specific data from context when relevant
- Suggest concrete actions when appropriate
- Explain technical concepts in accessible language
- If context is missing, ask clarifying questions
```

### 8.3 Context Persistence

**Storage:**

- Conversation context stored in database
- Recent context cached in session (optional)
- Context refreshed on each message (ensures up-to-date data)

---

## 9. LLM Integration Options

### 9.1 Option 1: OpenAI GPT-4/GPT-3.5-turbo (Recommended for MVP)

**Pros:**

- Easy integration
- Good performance
- Cost-effective (GPT-3.5-turbo)
- Fast response times

**Cons:**

- Requires API key
- Data sent to external service
- Cost scales with usage

**Implementation:**

```typescript
// lib/assistant/llm-service.ts
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function getLLMResponse(
  messages: Array<{ role: string; content: string }>,
  context: AssistantContext
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-4-turbo-preview", // or 'gpt-3.5-turbo' for cost savings
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(context),
      },
      ...messages,
    ],
    temperature: 0.7,
    max_tokens: 1000,
  });

  return response.choices[0].message.content || "";
}
```

### 9.2 Option 2: Anthropic Claude

**Pros:**

- Excellent for long contexts
- Good reasoning capabilities
- Strong safety features

**Cons:**

- Higher cost
- Slower than GPT-3.5

### 9.3 Option 3: Self-Hosted (Ollama, Local LLM)

**Pros:**

- No external API costs
- Data privacy
- Full control

**Cons:**

- Requires infrastructure
- Lower performance
- More complex setup

### 9.4 Option 4: Hybrid Approach

**Implementation:**

- Use GPT-3.5-turbo for general queries
- Use GPT-4 for complex analysis
- Cache common responses
- Fallback to rule-based responses for simple queries

**Recommended for MVP: OpenAI GPT-3.5-turbo**

- Balance of cost and performance
- Easy to upgrade to GPT-4 later
- Good enough for most use cases

---

## 10. Implementation Phases

### Phase 1: Foundation (Week 1)

- [ ] Database schema migration
- [ ] Basic API routes (chat, history, context)
- [ ] LLM service integration (OpenAI)
- [ ] Context builder
- [ ] Prompt builder

### Phase 2: Frontend Core (Week 2)

- [ ] Chat assistant component
- [ ] Chat window UI
- [ ] Message components
- [ ] Input component
- [ ] Basic styling

### Phase 3: Context & Integration (Week 3)

- [ ] Context selector
- [ ] Context-aware responses
- [ ] Integration into layout
- [ ] Conversation history
- [ ] Suggestion chips

### Phase 4: Advanced Features (Week 4)

- [ ] Action execution (suggested actions)
- [ ] Markdown rendering
- [ ] Code highlighting
- [ ] Error handling & retries
- [ ] Performance optimization

### Phase 5: Polish & Testing (Week 5)

- [ ] UI/UX refinements
- [ ] Loading states
- [ ] Error messages
- [ ] Testing
- [ ] Documentation

---

## 11. Integration Points

### 11.1 Layout Integration

**File: `app/layout.tsx` or `app/(user)/layout.tsx`**

```typescript
import { ChatAssistant } from "@/components/assistant/chat-assistant";

export default async function UserLayout({ children }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SiteHeader />
        {children}
        <ChatAssistant /> {/* Floating button */}
      </SidebarInset>
    </SidebarProvider>
  );
}
```

### 11.2 Page-Specific Context

**File: `app/(user)/monitors/[id]/page.tsx`**

```typescript
import { ChatAssistant } from "@/components/assistant/chat-assistant";

export default async function MonitorPage({ params }) {
  const { id } = await params;

  return (
    <div>
      <MonitorDetails monitorId={id} />
      <ChatAssistant
        defaultContext={{ type: "MONITOR", id }}
      />
    </div>
  );
}
```

**File: `app/(user)/incidents/[id]/page.tsx`**

```typescript
<ChatAssistant
  defaultContext={{ type: "INCIDENT", id }}
/>
```

### 11.3 Hooks Integration

**File: `hooks/useAssistant.ts`**

```typescript
export function useAssistantChat() {
  return useMutation({
    mutationFn: async (data: {
      message: string;
      conversationId?: string;
      contextType?: ConversationContext;
      contextId?: string;
    }) => {
      const response = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    },
  });
}

export function useAssistantHistory(conversationId?: string) {
  return useQuery({
    queryKey: ["assistant-history", conversationId],
    queryFn: async () => {
      const response = await fetch(
        `/api/assistant/history${conversationId ? `?conversationId=${conversationId}` : ""}`
      );
      return response.json();
    },
  });
}

export function useAssistantContext() {
  return useQuery({
    queryKey: ["assistant-context"],
    queryFn: async () => {
      const response = await fetch("/api/assistant/context");
      return response.json();
    },
  });
}
```

---

## 12. Environment Variables

Add to `.env`:

```env
# LLM Configuration
OPENAI_API_KEY=your_openai_api_key_here
LLM_MODEL=gpt-3.5-turbo  # or gpt-4-turbo-preview
LLM_MAX_TOKENS=1000
LLM_TEMPERATURE=0.7

# Optional: Rate limiting
ASSISTANT_RATE_LIMIT_PER_USER=50  # messages per hour
```

---

## 13. Security Considerations

1. **Input Validation**
   - Sanitize user messages
   - Limit message length
   - Rate limiting per user

2. **Context Privacy**
   - Only include user's own data
   - No sensitive data in prompts (passwords, keys)
   - Audit logs for LLM API calls

3. **Error Handling**
   - Don't expose API keys in errors
   - Graceful fallbacks
   - User-friendly error messages

4. **Cost Management**
   - Token limits
   - Context size limits
   - Usage monitoring

---

## 14. Testing Strategy

### Unit Tests

- Context builder
- Prompt builder
- Response parser

### Integration Tests

- API routes
- LLM service
- Database operations

### E2E Tests

- Chat flow
- Context switching
- Action execution

---

## 15. Future Enhancements

1. **Multi-language Support**
   - Detect user language
   - Respond in user's language

2. **Voice Input/Output**
   - Speech-to-text
   - Text-to-speech

3. **Advanced Analytics**
   - Predictive insights
   - Anomaly detection explanations

4. **Integration with External Tools**
   - Link to documentation
   - Execute actions via API
   - Export conversations

5. **Learning from Feedback**
   - User feedback on responses
   - Improve suggestions over time

---

## 16. File Structure Summary

```
w3uptime/
├── apps/
│   └── frontend/
│       ├── app/
│       │   └── api/
│       │       └── assistant/
│       │           ├── chat/
│       │           │   └── route.ts
│       │           ├── context/
│       │           │   └── route.ts
│       │           ├── history/
│       │           │   └── route.ts
│       │           └── conversations/
│       │               └── [id]/
│       │                   └── route.ts
│       ├── components/
│       │   └── assistant/
│       │       ├── chat-assistant.tsx
│       │       ├── chat-window.tsx
│       │       ├── message-list.tsx
│       │       ├── message-bubble.tsx
│       │       ├── chat-input.tsx
│       │       ├── context-selector.tsx
│       │       ├── suggestion-chips.tsx
│       │       └── assistant-button.tsx
│       ├── hooks/
│       │   └── useAssistant.ts
│       ├── lib/
│       │   ├── actions/
│       │   │   └── assistant.ts
│       │   └── assistant/
│       │       ├── context-builder.ts
│       │       ├── llm-service.ts
│       │       ├── prompt-builder.ts
│       │       └── response-parser.ts
│       └── types/
│           └── assistant.ts
└── packages/
    └── db/
        └── prisma/
            └── schema.prisma (updated)
```

---

## 17. Dependencies to Add

```json
{
  "dependencies": {
    "openai": "^4.0.0", // or anthropic SDK if using Claude
    "react-markdown": "^9.0.0", // For rendering markdown in messages
    "remark-gfm": "^4.0.0", // GitHub Flavored Markdown
    "react-syntax-highlighter": "^15.5.0" // Code highlighting
  }
}
```

---

## 18. Success Metrics

1. **Usage Metrics**
   - Number of conversations per user
   - Average messages per conversation
   - Most common query types

2. **Quality Metrics**
   - User satisfaction (feedback)
   - Action execution rate (how often users follow suggestions)
   - Response relevance (manual review)

3. **Performance Metrics**
   - Average response time
   - API error rate
   - Cost per conversation

---

## Approval Checklist

Before implementation, ensure:

- [ ] Database schema approved
- [ ] LLM provider selected (OpenAI recommended)
- [ ] API key obtained
- [ ] UI/UX design approved
- [ ] Integration points confirmed
- [ ] Budget for LLM API costs approved
- [ ] Security considerations reviewed

---

**End of Plan**

This plan provides a comprehensive roadmap for implementing the LLM-Based Assistant module. Once approved, we can proceed with implementation following the phases outlined above.

