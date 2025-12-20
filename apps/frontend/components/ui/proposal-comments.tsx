"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAddComment, useProposalComments } from "@/hooks/useProposals";
import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";

interface ProposalCommentsProps {
  proposalId: string;
}

export function ProposalComments({ proposalId }: ProposalCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const [reputationMessage, setReputationMessage] = useState<string | null>(
    null
  );

  const { data: comments, isLoading, error } = useProposalComments(proposalId);
  const addComment = useAddComment();

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || addComment.isPending) return;

    try {
      await addComment.mutateAsync({
        proposalId,
        comment: { content: newComment.trim() },
      });
      setNewComment("");
      setReputationMessage(null);
    } catch (error) {
      console.error("Failed to add comment:", error);
      const message =
        error instanceof Error ? error.message : String(error);

      if (message.includes("Insufficient reputation to comment on proposals")) {
        setReputationMessage(
          "Your reputation score is too low to comment on proposals."
        );
      } else {
        setReputationMessage(
          "Failed to add comment. Please try again later."
        );
      }
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (walletAddress: string) => {
    return walletAddress.slice(2, 4).toUpperCase();
  };

  if (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    const isReputationError = message.includes(
      "Insufficient reputation to comment on proposals"
    );

    return (
      <div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments
          </div>
        </div>
        <div className="p-4">
          <p className="text-muted-foreground text-center">
            {isReputationError
              ? "Your reputation score is too low to view or add comments on proposals."
              : "Failed to load comments. Please try again later."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Comments ({comments?.length || 0})
        </div>
      </div>
      <div className="space-y-4">
        {reputationMessage && (
          <p className="text-sm text-gray-200">{reputationMessage}</p>
        )}

        <form onSubmit={handleSubmitComment} className="space-y-3">
          <Textarea
            placeholder="Share your thoughts on this proposal..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={addComment.isPending}
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!newComment.trim() || addComment.isPending}
              className="flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {addComment.isPending ? "Posting..." : "Post Comment"}
            </Button>
          </div>
        </form>

        
        <div className="space-y-4">
          {isLoading ? (
            
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))
          ) : comments && comments.length > 0 ? (
            comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {getInitials(comment.user.walletAddress)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">
                      {comment.user.walletAddress.slice(0, 8)}...
                      {comment.user.walletAddress.slice(-6)}
                    </span>
                    <span className="text-muted-foreground">
                      {formatDate(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{comment.content}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No comments yet. Be the first to share your thoughts!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
