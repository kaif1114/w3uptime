"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Lightbulb,
  Settings,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Calendar,
  User,
  X,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

// Mock data for proposals
const mockProposals = [
  {
    id: "1",
    title: "Add Dark Mode Support",
    description:
      "Implement a dark theme option for better user experience in low-light environments. This would include dark backgrounds, light text, and appropriate contrast ratios.",
    type: "FEATURE_REQUEST" as const,
    status: "SUBMITTED" as const,
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
        vote: "UPVOTE" as const,
        createdAt: new Date("2024-01-16"),
      },
      {
        id: "v2",
        proposalId: "1",
        userId: "user3",
        vote: "UPVOTE" as const,
        createdAt: new Date("2024-01-17"),
      },
      {
        id: "v3",
        proposalId: "1",
        userId: "user4",
        vote: "DOWNVOTE" as const,
        createdAt: new Date("2024-01-18"),
      },
    ],
    comments: [
      {
        id: "c1",
        proposalId: "1",
        userId: "user2",
        content:
          "This is a great idea! Dark mode would definitely improve the user experience.",
        createdAt: new Date("2024-01-16"),
        updatedAt: new Date("2024-01-16"),
      },
      {
        id: "c2",
        proposalId: "1",
        userId: "user3",
        content:
          "I agree, especially for users working in low-light environments.",
        createdAt: new Date("2024-01-17"),
        updatedAt: new Date("2024-01-17"),
      },
    ],
    tags: ["UI/UX", "Accessibility", "Theme"],
  },
  {
    id: "2",
    title: "Improve Notification System",
    description:
      "Enhance the current notification system with better filtering options, customizable alert sounds, and the ability to snooze notifications for specific time periods.",
    type: "CHANGE_REQUEST" as const,
    status: "UNDER_REVIEW" as const,
    userId: "user2",
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2024-01-12"),
    user: {
      id: "user2",
      walletAddress: "0x8765...4321",
    },
    votes: [
      {
        id: "v4",
        proposalId: "2",
        userId: "user1",
        vote: "UPVOTE" as const,
        createdAt: new Date("2024-01-11"),
      },
      {
        id: "v5",
        proposalId: "2",
        userId: "user3",
        vote: "UPVOTE" as const,
        createdAt: new Date("2024-01-13"),
      },
    ],
    comments: [
      {
        id: "c3",
        proposalId: "2",
        userId: "user1",
        content:
          "The current notification system could definitely use some improvements. Good suggestion!",
        createdAt: new Date("2024-01-11"),
        updatedAt: new Date("2024-01-11"),
      },
    ],
    tags: ["Notifications", "User Experience", "Customization"],
  },
  {
    id: "3",
    title: "Add Multi-Language Support",
    description:
      "Implement internationalization (i18n) to support multiple languages including Spanish, French, German, and Chinese. This would make W3Uptime accessible to a global audience.",
    type: "FEATURE_REQUEST" as const,
    status: "APPROVED" as const,
    userId: "user3",
    createdAt: new Date("2024-01-05"),
    updatedAt: new Date("2024-01-08"),
    user: {
      id: "user3",
      walletAddress: "0x9876...5432",
    },
    votes: [
      {
        id: "v6",
        proposalId: "3",
        userId: "user1",
        vote: "UPVOTE" as const,
        createdAt: new Date("2024-01-06"),
      },
      {
        id: "v7",
        proposalId: "3",
        userId: "user2",
        vote: "UPVOTE" as const,
        createdAt: new Date("2024-01-07"),
      },
      {
        id: "v8",
        proposalId: "3",
        userId: "user4",
        vote: "UPVOTE" as const,
        createdAt: new Date("2024-01-09"),
      },
    ],
    comments: [
      {
        id: "c4",
        proposalId: "3",
        userId: "user1",
        content: "This would be amazing for international users!",
        createdAt: new Date("2024-01-06"),
        updatedAt: new Date("2024-01-06"),
      },
      {
        id: "c5",
        proposalId: "3",
        userId: "user2",
        content: "As a non-English speaker, this would be very helpful.",
        createdAt: new Date("2024-01-07"),
        updatedAt: new Date("2024-01-07"),
      },
    ],
    tags: ["Internationalization", "Accessibility", "Global"],
  },
];

export function CommunityGovernanceClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedProposal, setSelectedProposal] = useState<any>(null);

  // Filter proposals based on search and filter
  const filteredProposals = mockProposals.filter((proposal) => {
    const matchesSearch =
      !searchQuery ||
      proposal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      proposal.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      selectedFilter === "all" ||
      (selectedFilter === "feature" && proposal.type === "FEATURE_REQUEST") ||
      (selectedFilter === "change" && proposal.type === "CHANGE_REQUEST") ||
      (selectedFilter === "recent" && proposal.type === "FEATURE_REQUEST");

    return matchesSearch && matchesFilter;
  });

  // Sort proposals by creation date (newest first)
  const sortedProposals = [...filteredProposals].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleSearch = () => {
    // Search is handled in the filter logic above
  };

  const handleProposalClick = (proposal: any) => {
    setSelectedProposal(proposal);
  };

  const handleBackToList = () => {
    setSelectedProposal(null);
  };

  const getProposalTypeIcon = (type: string) => {
    return type === "FEATURE_REQUEST" ? (
      <Lightbulb className="h-4 w-4" />
    ) : (
      <Settings className="h-4 w-4" />
    );
  };

  const getProposalTypeColor = (type: string) => {
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

  const getUpvotes = (proposal: any) => {
    return (
      proposal.votes?.filter((vote: any) => vote.vote === "UPVOTE").length || 0
    );
  };

  const getDownvotes = (proposal: any) => {
    return (
      proposal.votes?.filter((vote: any) => vote.vote === "DOWNVOTE").length ||
      0
    );
  };

  const getCommentsCount = (proposal: any) => {
    return proposal.comments?.length || 0;
  };

  // If a proposal is selected, show the detail view
  if (selectedProposal) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToList}
            className="p-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Proposals
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                <div className="flex items-center space-x-2">
                  {getProposalTypeIcon(selectedProposal.type)}
                  <Badge
                    variant="secondary"
                    className={getProposalTypeColor(selectedProposal.type)}
                  >
                    {selectedProposal.type === "FEATURE_REQUEST"
                      ? "Feature Request"
                      : "Change Request"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={getStatusColor(selectedProposal.status)}
                  >
                    {selectedProposal.status.replace("_", " ")}
                  </Badge>
                </div>
                <CardTitle className="text-2xl">
                  {selectedProposal.title}
                </CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  {selectedProposal.description}
                </CardDescription>

                {selectedProposal.tags && selectedProposal.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedProposal.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex items-center justify-between text-sm text-muted-foreground border-b pb-4">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>
                    {selectedProposal.user?.walletAddress?.slice(0, 8)}...
                    {selectedProposal.user?.walletAddress?.slice(-6)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(selectedProposal.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{getUpvotes(selectedProposal)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ThumbsDown className="h-4 w-4" />
                  <span>{getDownvotes(selectedProposal)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="h-4 w-4" />
                  <span>{getCommentsCount(selectedProposal)}</span>
                </div>
              </div>
            </div>

            {selectedProposal.comments &&
              selectedProposal.comments.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Comments</h3>
                  <div className="space-y-3">
                    {selectedProposal.comments.map((comment: any) => (
                      <div key={comment.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            {comment.userId === "user1"
                              ? "0x1234...5678"
                              : comment.userId === "user2"
                                ? "0x8765...4321"
                                : comment.userId === "user3"
                                  ? "0x9876...5432"
                                  : "Anonymous"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm">{comment.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Row */}
      <div className="flex items-center space-x-4">
        <div className="flex-1">
          <Input
            placeholder="Search proposals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Select value={selectedFilter} onValueChange={setSelectedFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter proposals" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Proposals</SelectItem>
            <SelectItem value="feature">Feature Requests</SelectItem>
            <SelectItem value="change">Change Requests</SelectItem>
            <SelectItem value="recent">Recent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Proposals List */}
      <ProposalsList
        proposals={sortedProposals}
        getProposalTypeIcon={getProposalTypeIcon}
        getProposalTypeColor={getProposalTypeColor}
        getStatusColor={getStatusColor}
        getUpvotes={getUpvotes}
        getDownvotes={getDownvotes}
        getCommentsCount={getCommentsCount}
        onProposalClick={handleProposalClick}
      />
    </div>
  );
}

function ProposalsList({
  proposals,
  getProposalTypeIcon,
  getProposalTypeColor,
  getStatusColor,
  getUpvotes,
  getDownvotes,
  getCommentsCount,
  onProposalClick,
}: any) {
  if (proposals.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No proposals found</h3>
          <p className="text-muted-foreground text-center mb-4">
            Try adjusting your filters or be the first to submit a proposal!
          </p>
          <Link href="/community/create">
            <Button>Submit Your First Proposal</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {proposals.map((proposal: any) => (
        <Card
          key={proposal.id}
          className="hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onProposalClick(proposal)}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="flex items-center space-x-2">
                  {getProposalTypeIcon(proposal.type)}
                  <Badge
                    variant="secondary"
                    className={getProposalTypeColor(proposal.type)}
                  >
                    {proposal.type === "FEATURE_REQUEST"
                      ? "Feature Request"
                      : "Change Request"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={getStatusColor(proposal.status)}
                  >
                    {proposal.status.replace("_", " ")}
                  </Badge>
                </div>
                <CardTitle className="hover:text-primary">
                  {proposal.title}
                </CardTitle>
                <CardDescription className="line-clamp-2">
                  {proposal.description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>
                    {proposal.user?.walletAddress?.slice(0, 8)}...
                    {proposal.user?.walletAddress?.slice(-6)}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(proposal.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <ThumbsUp className="h-4 w-4" />
                  <span>{getUpvotes(proposal)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ThumbsDown className="h-4 w-4" />
                  <span>{getDownvotes(proposal)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-4 w-4" />
                  <span>{getCommentsCount(proposal)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
