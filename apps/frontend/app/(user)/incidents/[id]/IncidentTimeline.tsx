"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAddComment } from "@/hooks/useAddComment";
import { useIncidentTimeline } from "@/hooks/useIncidentTimeline";
import type { TimelineEvent } from "@/types/incident";
import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface IncidentTimelineProps {
  incidentId: string;
}

export default function IncidentTimeline({
  incidentId,
}: IncidentTimelineProps) {
  const [newComment, setNewComment] = useState("");
  const {
    data,
    isLoading,
    error,
    refetch: refetchTimeline,
  } = useIncidentTimeline(incidentId);
  const addCommentMutation = useAddComment();

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    try {
      await addCommentMutation.mutateAsync({
        incidentId,
        description: newComment,
      });
      setNewComment("");
      toast.success("Comment posted successfully");
      refetchTimeline();
    } catch (error) {
      console.error(error);
      toast.error("Failed to post comment");
    }
  };

  const getTimelineIcon = (type: string) => {
    switch (type) {
      case "INCIDENT":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "RESOLUTION":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "USER_COMMENT":
        return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case "ESCALATION":
        return <Mail className="h-4 w-4 text-orange-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTimelineTitle = (event: TimelineEvent) => {
    switch (event.type) {
      case "INCIDENT":
        return event.description;
      case "RESOLUTION":
        return event.description;
      case "USER_COMMENT":
        return "Comment";
      case "POSTMORTEM":
        return "Postmortem";
      case "ESCALATION":
        return event?.description|| "Escalation triggered";
      default:
        return "Timeline event";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
            <p className="text-sm text-gray-500">Loading timeline...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <p className="text-red-500 mb-4">
              Error loading timeline: {error.message}
            </p>
            <Button onClick={() => window.location.reload()} size="sm">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="space-y-4">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              <User className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Textarea
              placeholder="Leave a comment or post-mortem. You can use markdown here or @mention a colleague."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="min-h-[80px] resize-none"
            />
            <div className="flex justify-end mt-2">
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || addCommentMutation.isPending}
                size="sm"
              >
                {addCommentMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>

      
      <div className="relative">
        
        {data?.timelineEvents && data?.timelineEvents.length > 1 && (
          <div className="absolute left-4 top-8 bottom-0 w-0.5 bg-border" />
        )}

        <div className="space-y-6">
          {data?.timelineEvents && data?.timelineEvents.length > 0 ? (
            data?.timelineEvents.map((event) => (
              <div
                key={event.id}
                className={
                  "flex gap-4 relative " +
                  (event.type === "USER_COMMENT" || event.type === "POSTMORTEM"
                    ? "items-start"
                    : "items-center")
                }
              >
                
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted border-2 border-background relative z-10 shrink-0">
                  
                  <div className="flex items-center justify-center h-4 w-4">
                    {getTimelineIcon(event.type)}
                  </div>
                </div>

                
                <div
                  className={
                    "flex-1 " +
                    (event.type === "USER_COMMENT" ||
                    event.type === "POSTMORTEM"
                      ? "space-y-3 pt-0.5"
                      : "space-y-2")
                  }
                >
                  <div className="flex items-center gap-2 ml-2">
                    <h3 className="font-medium text-sm">
                      {getTimelineTitle(event)}
                    </h3>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(event.createdAt), "MMM d 'at' h:mm a")}
                    </span>
                  </div>

                  {(event.type === "USER_COMMENT" ||
                    event.type === "POSTMORTEM") && (
                    <div className="text-sm text-muted-foreground ml-6">
                      {event.description}
                    </div>
                  )}

                  {event.user &&
                    (event.type === "USER_COMMENT" ||
                      event.type === "POSTMORTEM") && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground ml-6">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            <User className="h-3 w-3" />
                          </AvatarFallback>
                        </Avatar>
                        <span>User {event.user.id}</span>
                      </div>
                    )}

                  
                  {event.escalationLog && (
                    <div className="bg-muted p-3 rounded-md text-sm space-y-2 ml-2">
                      {event.escalationLog.Alert && (
                        <div>
                          <p className="font-medium">
                            {event.escalationLog.Alert.title}
                          </p>
                          <p className="text-muted-foreground">
                            {event.escalationLog.Alert.message}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              Status Code:{" "}
                              {event.escalationLog.Alert.triggerStatusCode}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              Expected:{" "}
                              {event.escalationLog.Alert.expectedStatusCode}
                            </span>
                          </div>
                        </div>
                      )}
                      {event.escalationLog.escalationLevel && (
                        <div>
                          <p className="font-medium">
                            Level{" "}
                            {event.escalationLog.escalationLevel.levelOrder}:{" "}
                            {event.escalationLog.escalationLevel.name}
                          </p>
                          <p className="text-muted-foreground">
                            Channel:{" "}
                            {event.escalationLog.escalationLevel.channel}
                          </p>
                          {event.escalationLog.escalationLevel.contacts.length >
                            0 && (
                            <p className="text-muted-foreground">
                              Contacts:{" "}
                              {event.escalationLog.escalationLevel.contacts.join(
                                ", "
                              )}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2" />
              <p>No timeline events yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
