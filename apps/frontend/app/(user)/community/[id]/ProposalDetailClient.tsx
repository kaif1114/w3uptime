"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Lightbulb,
  Settings,
  ArrowLeft,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  Calendar,
  User,
  Tag,
  Edit,
  Trash2,
} from "lucide-react";
import Link from "next/link";

interface ProposalDetailClientProps {
  proposalId: string;
}

// Mock data for the proposal
const mockProposal = {
  id: "1",
  title: "Add Dark Mode Support",
  description:
    "Implement a dark theme option for better user experience in low-light environments. This would include dark backgrounds, light text, and appropriate contrast ratios. The implementation should consider accessibility standards and provide a seamless toggle between light and dark modes.",
  type: "FEATURE_REQUEST" as "FEATURE_REQUEST" | "CHANGE_REQUEST",
  status: "SUBMITTED" as
    | "SUBMITTED"
    | "UNDER_REVIEW"
    | "APPROVED"
    | "REJECTED"
    | "IMPLEMENTED",
  userId: "user1",
  createdAt: new Date("2024-01-15"),
  updatedAt: new Date("2024-01-15"),
  user: {
    id: "user1",
    walletAddress: "0x1234...5678",
  },
  votes: [
    {
      id: "v1",
      proposalId: "1",
      userId: "user2",
      vote: "UPVOTE" as "UPVOTE" | "DOWNVOTE",
      createdAt: new Date("2024-01-16"),
    },
    {
      id: "v2",
      proposalId: "1",
      userId: "user3",
      vote: "UPVOTE" as "UPVOTE" | "DOWNVOTE",
      createdAt: new Date("2024-01-17"),
    },
    {
      id: "v3",
      proposalId: "1",
      userId: "user4",
      vote: "DOWNVOTE" as "UPVOTE" | "DOWNVOTE",
      createdAt: new Date("2024-01-18"),
    },
  ],
  comments: [
    {
      id: "c1",
      proposalId: "1",
      userId: "user2",
      content:
        "This is a great idea! Dark mode would definitely improve the user experience, especially for users working late at night.",
      createdAt: new Date("2024-01-16"),
      updatedAt: new Date("2024-01-16"),
      user: { id: "user2", walletAddress: "0x8765...4321" },
    },
    {
      id: "c2",
      proposalId: "1",
      userId: "user3",
      content:
        "I agree, especially for users working in low-light environments. It would also help reduce eye strain.",
      createdAt: new Date("2024-01-17"),
      updatedAt: new Date("2024-01-17"),
      user: { id: "user3", walletAddress: "0x9876...5432" },
    },
  ],
  tags: ["UI/UX", "Accessibility", "Theme", "User Experience"],
};

export function ProposalDetailClient({
  proposalId,
}: ProposalDetailClientProps) {
  const [commentContent, setCommentContent] = useState("");
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [localVotes, setLocalVotes] = useState(mockProposal.votes);
  const [localComments, setLocalComments] = useState(mockProposal.comments);
  const [isVoting, setIsVoting] = useState(false);
  const [isCommenting, setIsCommenting] = useState(false);

  const handleVote = async (vote: "UPVOTE" | "DOWNVOTE") => {
    setIsVoting(true);

    // Simulate API call delay
    setTimeout(() => {
      // Simulate vote logic
      const existingVoteIndex = localVotes.findIndex(
        (v) => v.userId === "currentUser"
      );

      if (existingVoteIndex >= 0) {
        if (localVotes[existingVoteIndex].vote === vote) {
          // Remove vote if same type
          setLocalVotes((prev) =>
            prev.filter((_, index) => index !== existingVoteIndex)
          );
        } else {
          // Change vote
          setLocalVotes((prev) =>
            prev.map((v, index) =>
              index === existingVoteIndex ? { ...v, vote } : v
            )
          );
        }
      } else {
        // Add new vote
        setLocalVotes((prev) => [
          ...prev,
          {
            id: `v${Date.now()}`,
            proposalId: "1",
            userId: "currentUser",
            vote,
            createdAt: new Date(),
          },
        ]);
      }
      setIsVoting(false);
    }, 500);
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim()) return;

    setIsCommenting(true);

    // Simulate API call delay
    setTimeout(() => {
      const newComment = {
        id: `c${Date.now()}`,
        proposalId: "1",
        userId: "currentUser",
        content: commentContent.trim(),
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: "currentUser", walletAddress: "0x1111...2222" },
      };

      setLocalComments((prev) => [...prev, newComment]);
      setCommentContent("");
      setShowCommentForm(false);
      setIsCommenting(false);
    }, 500);
  };

  const getProposalTypeIcon = (type: "FEATURE_REQUEST" | "CHANGE_REQUEST") => {
    return type === "FEATURE_REQUEST" ? (
      <Lightbulb className="h-5 w-5 text-blue-500" />
    ) : (
      <Settings className="h-5 w-5 text-green-500" />
    );
  };

  const getProposalTypeColor = (type: "FEATURE_REQUEST" | "CHANGE_REQUEST") => {
    return type === "FEATURE_REQUEST"
      ? "bg-blue-100 text-blue-800"
      : "bg-green-100 text-green-800";
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      SUBMITTED: "bg-yellow-100 text-yellow-800",
      UNDER_REVIEW: "bg-blue-100 text-blue-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
      IMPLEMENTED: "bg-purple-100 text-purple-800",
    };
    return colors[status] || "bg-gray-100 text-gray-800";
  };

  const getUpvotes = () => {
    return localVotes.filter((vote) => vote.vote === "UPVOTE").length;
  };

  const getDownvotes = () => {
    return localVotes.filter((vote) => vote.vote === "DOWNVOTE").length;
  };

  const getCommentsCount = () => {
    return localComments.length;
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <div className="flex items-center space-x-2">
        <Link href="/community">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Proposals
          </Button>
        </Link>
      </div>

      {/* Proposal Header */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getProposalTypeIcon(mockProposal.type)}
                <Badge
                  variant="secondary"
                  className={getProposalTypeColor(mockProposal.type)}
                >
                  {mockProposal.type === "FEATURE_REQUEST"
                    ? "Feature Request"
                    : "Change Request"}
                </Badge>
                <Badge
                  variant="outline"
                  className={getStatusColor(mockProposal.status)}
                >
                  {mockProposal.status.replace("_", " ")}
                </Badge>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
            <div>
              <CardTitle className="text-2xl">{mockProposal.title}</CardTitle>
              <CardDescription className="text-base mt-2">
                {mockProposal.description}
              </CardDescription>
            </div>

            {/* Tags */}
            {mockProposal.tags && mockProposal.tags.length > 0 && (
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-2">
                  {mockProposal.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Meta Information */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>
                    {mockProposal.user?.walletAddress?.slice(0, 8)}...
                    {mockProposal.user?.walletAddress?.slice(-6)}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    Created{" "}
                    {new Date(mockProposal.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {mockProposal.updatedAt !== mockProposal.createdAt && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Updated{" "}
                      {new Date(mockProposal.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Voting Section */}
      <Card>
        <CardHeader>
          <CardTitle>Community Feedback</CardTitle>
          <CardDescription>
            Vote on this proposal to show your support or concerns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleVote("UPVOTE")}
                disabled={isVoting}
                className="flex items-center space-x-2"
              >
                <ThumbsUp className="h-5 w-5" />
                <span>Upvote ({getUpvotes()})</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => handleVote("DOWNVOTE")}
                disabled={isVoting}
                className="flex items-center space-x-2"
              >
                <ThumbsDown className="h-5 w-5" />
                <span>Downvote ({getDownvotes()})</span>
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Total votes: {getUpvotes() + getDownvotes()}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Comments ({getCommentsCount()})</CardTitle>
              <CardDescription>
                Discuss this proposal with the community
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowCommentForm(!showCommentForm)}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Add Comment
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comment Form */}
          {showCommentForm && (
            <div className="border rounded-lg p-4">
              <form onSubmit={handleAddComment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="comment">Your Comment</Label>
                  <Textarea
                    id="comment"
                    placeholder="Share your thoughts on this proposal..."
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    rows={4}
                    required
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCommentForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isCommenting || !commentContent.trim()}
                  >
                    {isCommenting ? "Posting..." : "Post Comment"}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* Comments List */}
          <div className="space-y-4">
            {localComments && localComments.length > 0 ? (
              localComments.map((comment: any) => (
                <div key={comment.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">
                        {comment.user?.walletAddress?.slice(0, 8)}...
                        {comment.user?.walletAddress?.slice(-6)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm">{comment.content}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No comments yet. Be the first to share your thoughts!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
