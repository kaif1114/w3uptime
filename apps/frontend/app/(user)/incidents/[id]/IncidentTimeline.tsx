"use client";

import { useState } from "react";
import { Incident, Comment } from "@/types/incident";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Send,
  Mail,
  Phone,
  MessageCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface IncidentTimelineProps {
  incident: Incident;
}

interface TimelineEvent {
  id: string;
  type:
    | "incident_start"
    | "comment"
    | "postmortem"
    | "status_change"
    | "email"
    | "phone"
    | "text"
    | "zapier";
  timestamp: Date;
  title: string;
  description?: string;
  user?: {
    id: string;
    walletAddress: string;
  };
  icon: React.ReactNode;
  region?: string;
}

export default function IncidentTimeline({ incident }: IncidentTimelineProps) {
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getInitials = (walletAddress: string) => {
    return walletAddress.slice(2, 4).toUpperCase();
  };

  const getShortAddress = (walletAddress: string) => {
    return `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;

    setIsSubmitting(true);
    try {
      // TODO: Implement comment submission
      toast.info("Comment functionality will be implemented later");
      setNewComment("");
    } catch (error) {
      toast.error("Failed to post comment");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Create timeline events
  const timelineEvents: TimelineEvent[] = [];

  // Add incident start event
  timelineEvents.push({
    id: "incident-start",
    type: "incident_start",
    timestamp: new Date(incident.createdAt),
    title: "Incident started",
    icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
  });

  // Add sample notification events (like in reference UI)
  const notificationTime = new Date(incident.createdAt);
  notificationTime.setMinutes(notificationTime.getMinutes() + 1);

  timelineEvents.push({
    id: "email-notification",
    type: "email",
    timestamp: notificationTime,
    title: `Sent an email to Muhammad Kaif at kaif@w3uptime.com`,
    icon: <Mail className="h-4 w-4 text-blue-500" />,
  });

  timelineEvents.push({
    id: "phone-notification",
    type: "phone",
    timestamp: notificationTime,
    title: `Calling Muhammad Kaif at (202) 555-0168`,
    icon: <Phone className="h-4 w-4 text-green-500" />,
  });

  timelineEvents.push({
    id: "text-notification",
    type: "text",
    timestamp: notificationTime,
    title: `Texted Muhammad Kaif at (202) 555-0168`,
    icon: <MessageCircle className="h-4 w-4 text-blue-500" />,
  });

  // Add comments
  incident.comments.forEach((comment) => {
    timelineEvents.push({
      id: comment.id,
      type: "comment",
      timestamp: new Date(comment.createdAt),
      title: "Comment",
      description: comment.description,
      user: comment.user,
      icon: <MessageSquare className="h-4 w-4 text-blue-500" />,
    });
  });

  // Add post-mortem if exists
  if (incident.postmortem) {
    timelineEvents.push({
      id: incident.postmortem.id,
      type: "postmortem",
      timestamp: new Date(incident.postmortem.createdAt),
      title: "Post-mortem created",
      description: incident.postmortem.rootCause,
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    });
  }

  // Add status change events
  if (incident.status === "ACKNOWLEDGED" || incident.status === "RESOLVED") {
    timelineEvents.push({
      id: "status-change",
      type: "status_change",
      timestamp: new Date(incident.updatedAt),
      title: `Status changed to ${incident.status}`,
      icon: <CheckCircle className="h-4 w-4 text-green-500" />,
    });
  }

  // Sort events by timestamp (newest first)
  timelineEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  return (
    <div className="space-y-6">
      {/* Comment Input - Styled like reference UI */}
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
                disabled={!newComment.trim() || isSubmitting}
                size="sm"
              >
                <Send className="h-4 w-4 mr-2" />
                Post
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline Events */}
      <div className="space-y-4">
        {timelineEvents.map((event, index) => (
          <div key={event.id} className="flex gap-4">
            {/* Timeline Line */}
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
                {event.icon}
              </div>
              {index < timelineEvents.length - 1 && (
                <div className="w-0.5 h-8 bg-border mt-2" />
              )}
            </div>

            {/* Event Content */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-sm">{event.title}</h3>
                <span className="text-sm text-muted-foreground">
                  {format(event.timestamp, "MMM d 'at' h:mm a")}
                </span>
                {event.region && (
                  <Badge variant="outline" className="text-xs">
                    {event.region}
                  </Badge>
                )}
              </div>

              {event.description && (
                <div className="text-sm text-muted-foreground">
                  {event.description}
                </div>
              )}

              {event.user && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {getInitials(event.user.walletAddress)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{getShortAddress(event.user.walletAddress)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {timelineEvents.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <MessageSquare className="h-8 w-8 mx-auto mb-2" />
          <p>No timeline events yet</p>
        </div>
      )}
    </div>
  );
}
