"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, X, Send, Bot, Loader2, ChevronDown, ChevronUp, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAssistantChat, useAssistantContext } from "@/hooks/useAssistant";
import {
  AssistantMessage,
  ConversationContext,
  SuggestedAction,
  ToolResult,
} from "@/types/assistant";
import { cn } from "@/lib/utils";

type ChatAssistantProps = {
  defaultContext?: {
    type?: ConversationContext;
    id?: string;
  };
  position?: "bottom-right" | "bottom-left" | "inline";
};

const positionClass: Record<
  NonNullable<ChatAssistantProps["position"]>,
  string
> = {
  "bottom-right": "fixed bottom-6 right-6",
  "bottom-left": "fixed bottom-6 left-6",
  inline: "",
};

type ActionSpec = {
  required: string[];
  optional?: string[];
};

const ACTION_SPECS: Record<string, ActionSpec> = {
  create_monitor: {
    required: ["name", "url"],
    optional: [
      "timeout",
      "checkInterval",
      "expectedStatusCodes",
      "escalationPolicyId",
    ],
  },
  pause_monitor: { required: ["monitorId"] },
  resume_monitor: { required: ["monitorId"] },
  delete_monitor: { required: ["monitorId"] },
  create_escalation_policy: { required: ["name"], optional: ["levels"] },
  remove_escalation_policy: { required: ["escalationPolicyId"] },
  edit_escalation_policy: {
    required: ["escalationPolicyId"],
    optional: ["name", "enabled", "levels"],
  },
  view_incident_timeline: { required: ["incidentId"] },
  acknowledge_incident: { required: ["incidentId"] },
  resolve_incident: { required: ["incidentId"] },
};

export function ChatAssistant({
  defaultContext,
  position = "bottom-right",
}: ChatAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [input, setInput] = useState("");
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [expandedToolResults, setExpandedToolResults] = useState<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: contextSummary, isLoading: contextLoading } =
    useAssistantContext();
  const chatMutation = useAssistantChat();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "USER",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const response = await chatMutation.mutateAsync({
        message: userMessage.content,
        conversationId,
        contextType: defaultContext?.type,
        contextId: defaultContext?.id,
      });

      setConversationId(response.conversationId);

      // Store tool results and tools used in message metadata if available
      const messageMetadata = {
        ...response.message.metadata,
        toolResults: response.toolResults,
        toolsUsed: response.toolsUsed,
      };

      setMessages((prev) => [
        ...prev,
        {
          id: response.message.id,
          role: response.message.role,
          content: response.message.content,
          createdAt: response.message.createdAt,
          metadata: messageMetadata,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "ASSISTANT",
          content:
            (error as Error).message ||
            "Sorry, I couldn't process that right now.",
          createdAt: new Date().toISOString(),
        },
      ]);
    }
  };

  const headerContextLabel = useMemo(() => {
    if (defaultContext?.type === "MONITOR") return "Monitor context";
    if (defaultContext?.type === "INCIDENT") return "Incident context";
    return "General";
  }, [defaultContext]);

  const handleActionClick = async (
    action: SuggestedAction,
    messageId: string
  ) => {
    const confirmNeeded =
      action.confirm ||
      action.type === "delete_monitor" ||
      action.type === "remove_escalation_policy";

    if (confirmNeeded && !window.confirm("Are you sure?")) return;

    try {
      setPendingActionId(`${messageId}:${action.type}`);
      setActionStatus(null);
      const res = await fetch("/api/assistant/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          actionType: action.type,
          actionData: action.data ?? {},
        }),
      });
      const json = await res.json();
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || "Action failed");
      }
      setActionStatus("Action completed");
    } catch (err) {
      setActionStatus((err as Error).message);
    } finally {
      setPendingActionId(null);
    }
  };

  const renderToolInfo = (msg: AssistantMessage) => {
    const toolsUsed = msg.metadata?.toolsUsed as string[] | undefined;
    const toolResults = msg.metadata?.toolResults as ToolResult[] | undefined;

    if (!toolsUsed || toolsUsed.length === 0) return null;

    const isExpanded = expandedToolResults.has(msg.id);

    return (
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px]">
            <Database className="h-3 w-3 mr-1" />
            Used {toolsUsed.length} tool{toolsUsed.length > 1 ? "s" : ""}: {toolsUsed.join(", ")}
          </Badge>
          {toolResults && toolResults.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-2 text-[10px]"
              onClick={() => {
                setExpandedToolResults((prev) => {
                  const next = new Set(prev);
                  if (isExpanded) {
                    next.delete(msg.id);
                  } else {
                    next.add(msg.id);
                  }
                  return next;
                });
              }}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3 w-3 mr-1" />
                  Hide results
                </>
              ) : (
                <>
                  <ChevronDown className="h-3 w-3 mr-1" />
                  Show results
                </>
              )}
            </Button>
          )}
        </div>
        {isExpanded && toolResults && toolResults.length > 0 && (
          <div className="mt-1 space-y-2 border-l-2 border-muted pl-2">
            {toolResults.map((toolResult, index) => (
              <div key={index} className="text-[10px]">
                <div className="font-semibold text-muted-foreground mb-1">
                  {toolResult.toolType}
                  {toolResult.error && (
                    <Badge variant="destructive" className="ml-2 text-[9px]">
                      Error
                    </Badge>
                  )}
                </div>
                {toolResult.error ? (
                  <div className="text-destructive font-mono">
                    {toolResult.error}
                  </div>
                ) : (
                  <pre className="text-[9px] bg-muted/50 p-2 rounded overflow-x-auto max-h-32 overflow-y-auto">
                    {JSON.stringify(toolResult.result, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderActions = (msg: AssistantMessage) => {
    const actions = msg.metadata?.suggestedActions;
    if (!actions || !actions.length) return null;
    return (
      <div className="mt-2 flex flex-col gap-2">
        {actions.map((action) => {
          const id = `${msg.id}:${action.type}`;
          const isPending = pendingActionId === id;
          const spec = ACTION_SPECS[action.type] || { required: [] };
          const data = action.data || {};
          const missing = spec.required.filter(
            (field) =>
              data[field] === undefined ||
              data[field] === null ||
              data[field] === ""
          );
          const preview =
            Object.keys(data).length > 0 ? JSON.stringify(data) : "";
          return (
            <div key={id} className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={isPending || missing.length > 0}
                  onClick={() => handleActionClick(action, msg.id)}
                >
                  {isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    action.label || action.type
                  )}
                </Button>
                {missing.length > 0 && (
                  <span className="text-[11px] text-destructive">
                    Missing: {missing.join(", ")}
                  </span>
                )}
              </div>
              {preview && (
                <div className="text-[11px] text-muted-foreground">
                  Preview: <code className="break-all">{preview}</code>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={positionClass[position]}>
      {/* Toggle button */}
      {position !== "inline" && (
        <Button
          variant="default"
          size="lg"
          className={cn(
            "shadow-lg gap-2",
            open ? "hidden" : "flex items-center"
          )}
          onClick={() => setOpen(true)}
        >
          <MessageCircle className="h-4 w-4" />
          Ask Assistant
        </Button>
      )}

      {/* Chat panel */}
      {open && (
        <Card
          className={cn(
            "w-[360px] max-w-[90vw] shadow-2xl border bg-card text-card-foreground",
            position !== "inline" && "fixed bottom-6 right-6"
          )}
        >
          <div className="flex items-start justify-between p-3 border-b">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                <p className="text-sm font-semibold">W3Uptime Assistant</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{headerContextLabel}</Badge>
                {contextLoading && (
                  <span className="text-xs text-muted-foreground">
                    Loading context...
                  </span>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div
            ref={scrollRef}
            className="max-h-[360px] overflow-y-auto px-3 py-2 space-y-3"
          >
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground">
                Ask me about your monitors, incidents, or how to configure your
                checks.
              </div>
            )}
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  msg.role === "USER"
                    ? "bg-primary text-primary-foreground ml-auto max-w-[85%]"
                    : "bg-muted text-muted-foreground max-w-[95%]"
                )}
              >
                <div>{msg.content}</div>
                {msg.role === "ASSISTANT" && (
                  <>
                    {renderToolInfo(msg)}
                    {renderActions(msg)}
                  </>
                )}
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Thinking...</span>
                <Badge variant="outline" className="text-[10px] ml-2">
                  May fetch data
                </Badge>
              </div>
            )}
            {actionStatus && (
              <div className="text-[11px] text-muted-foreground">
                {actionStatus}
              </div>
            )}
          </div>

          <div className="border-t p-3 space-y-2">
            <Textarea
              placeholder="Ask about monitors, incidents, alerts..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={2}
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex items-center justify-between">
              {contextSummary?.monitors?.length ? (
                <p className="text-[11px] text-muted-foreground">
                  Context loaded for {contextSummary.monitors.length} monitors
                </p>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Context will load automatically
                </p>
              )}
              <Button
                size="sm"
                onClick={handleSend}
                disabled={chatMutation.isPending}
              >
                {chatMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
