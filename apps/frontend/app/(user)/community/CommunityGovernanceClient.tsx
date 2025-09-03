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
  ArrowUp,
  ArrowDown,
  Calendar,
  User,
  X,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
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
  // Add more mock proposals to demonstrate pagination
  {
    id: "4",
    title: "Implement Advanced Analytics Dashboard",
    description:
      "Create a comprehensive analytics dashboard with real-time metrics, customizable charts, and export functionality for better data insights.",
    type: "FEATURE_REQUEST" as const,
    status: "SUBMITTED" as const,
    userId: "user4",
    createdAt: new Date("2024-01-20"),
    updatedAt: new Date("2024-01-20"),
    user: {
      id: "user4",
      walletAddress: "0x5432...8765",
    },
    votes: [],
    comments: [],
    tags: ["Analytics", "Dashboard", "Data"],
  },
  {
    id: "5",
    title: "Add API Rate Limiting",
    description:
      "Implement rate limiting for the public API to prevent abuse and ensure fair usage across all users.",
    type: "CHANGE_REQUEST" as const,
    status: "UNDER_REVIEW" as const,
    userId: "user5",
    createdAt: new Date("2024-01-18"),
    updatedAt: new Date("2024-01-19"),
    user: {
      id: "user5",
      walletAddress: "0x6789...1234",
    },
    votes: [],
    comments: [],
    tags: ["API", "Security", "Performance"],
  },
  {
    id: "6",
    title: "Mobile App Development",
    description:
      "Develop native mobile applications for iOS and Android to provide on-the-go monitoring capabilities.",
    type: "FEATURE_REQUEST" as const,
    status: "SUBMITTED" as const,
    userId: "user6",
    createdAt: new Date("2024-01-22"),
    updatedAt: new Date("2024-01-22"),
    user: {
      id: "user6",
      walletAddress: "0x1357...2468",
    },
    votes: [],
    comments: [],
    tags: ["Mobile", "iOS", "Android"],
  },
  {
    id: "7",
    title: "Enhanced Email Notifications",
    description:
      "Improve email notification templates with better formatting, customizable content, and delivery tracking.",
    type: "CHANGE_REQUEST" as const,
    status: "SUBMITTED" as const,
    userId: "user7",
    createdAt: new Date("2024-01-25"),
    updatedAt: new Date("2024-01-25"),
    user: {
      id: "user7",
      walletAddress: "0x2468...1357",
    },
    votes: [],
    comments: [],
    tags: ["Email", "Notifications", "Templates"],
  },
  {
    id: "8",
    title: "Integration with Slack",
    description:
      "Add Slack integration for real-time incident notifications and team collaboration.",
    type: "FEATURE_REQUEST" as const,
    status: "SUBMITTED" as const,
    userId: "user8",
    createdAt: new Date("2024-01-28"),
    updatedAt: new Date("2024-01-28"),
    user: {
      id: "user8",
      walletAddress: "0x3698...1472",
    },
    votes: [],
    comments: [],
    tags: ["Slack", "Integration", "Collaboration"],
  },
];

const ITEMS_PER_PAGE = 5;

export function CommunityGovernanceClient() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedProposal, setSelectedProposal] = useState<any>(null);
  const [localVotes, setLocalVotes] = useState<{ [key: string]: any[] }>({});
  const [isVoting, setIsVoting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

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

  // Pagination logic
  const totalPages = Math.ceil(sortedProposals.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedProposals = sortedProposals.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  // Reset to first page when search or filter changes
  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setSelectedFilter(value);
    setCurrentPage(1);
  };

  const handleProposalClick = (proposal: any) => {
    setSelectedProposal(proposal);
  };

  const handleBackToList = () => {
    setSelectedProposal(null);
  };

  const handleVote = async (
    proposalId: string,
    vote: "UPVOTE" | "DOWNVOTE"
  ) => {
    setIsVoting(true);

    // Simulate API call delay
    setTimeout(() => {
      // Initialize local votes for this proposal if not exists
      if (!localVotes[proposalId]) {
        localVotes[proposalId] = [];
      }

      // Simulate vote logic
      const existingVoteIndex = localVotes[proposalId].findIndex(
        (v) => v.userId === "currentUser"
      );

      if (existingVoteIndex >= 0) {
        if (localVotes[proposalId][existingVoteIndex].vote === vote) {
          // Remove vote if same type
          setLocalVotes((prev) => ({
            ...prev,
            [proposalId]: prev[proposalId].filter(
              (_, index) => index !== existingVoteIndex
            ),
          }));
        } else {
          // Change vote
          setLocalVotes((prev) => ({
            ...prev,
            [proposalId]: prev[proposalId].map((v, index) =>
              index === existingVoteIndex ? { ...v, vote } : v
            ),
          }));
        }
      } else {
        // Add new vote
        setLocalVotes((prev) => ({
          ...prev,
          [proposalId]: [
            ...(prev[proposalId] || []),
            {
              id: `v${Date.now()}`,
              proposalId,
              userId: "currentUser",
              vote,
              createdAt: new Date(),
            },
          ],
        }));
      }
      setIsVoting(false);
    }, 500);
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
    const originalVotes =
      proposal.votes?.filter((vote: any) => vote.vote === "UPVOTE").length || 0;
    const localUpvotes =
      localVotes[proposal.id]?.filter((vote: any) => vote.vote === "UPVOTE")
        .length || 0;
    return originalVotes + localUpvotes;
  };

  const getDownvotes = (proposal: any) => {
    const originalVotes =
      proposal.votes?.filter((vote: any) => vote.vote === "DOWNVOTE").length ||
      0;
    const localDownvotes =
      localVotes[proposal.id]?.filter((vote: any) => vote.vote === "DOWNVOTE")
        .length || 0;
    return originalVotes + localDownvotes;
  };

  // Comments temporarily disabled

  const getUserVote = (proposalId: string) => {
    const userVote = localVotes[proposalId]?.find(
      (v) => v.userId === "currentUser"
    );
    return userVote ? userVote.vote : null;
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
                  <ArrowUp className="h-4 w-4" />
                  <span>{getUpvotes(selectedProposal)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <ArrowDown className="h-4 w-4" />
                  <span>{getDownvotes(selectedProposal)}</span>
                </div>
              </div>
            </div>

            {/* Voting Section */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="text-lg font-semibold mb-4">
                Vote on this proposal
              </h3>
              <div className="flex items-center justify-between">
                <div className="flex space-x-4">
                  <Button
                    variant={
                      getUserVote(selectedProposal.id) === "UPVOTE"
                        ? "default"
                        : "outline"
                    }
                    size="lg"
                    onClick={() => handleVote(selectedProposal.id, "UPVOTE")}
                    disabled={isVoting}
                    className="flex items-center space-x-2"
                  >
                    <ArrowUp className="h-5 w-5" />
                    <span>Upvote</span>
                  </Button>
                  <Button
                    variant={
                      getUserVote(selectedProposal.id) === "DOWNVOTE"
                        ? "default"
                        : "outline"
                    }
                    size="lg"
                    onClick={() => handleVote(selectedProposal.id, "DOWNVOTE")}
                    className="flex items-center space-x-2"
                  >
                    <ArrowDown className="h-5 w-5" />
                    <span>Downvote</span>
                  </Button>
                </div>
                <div className="text-sm text-muted-foreground">
                  Total votes:{" "}
                  {getUpvotes(selectedProposal) +
                    getDownvotes(selectedProposal)}
                </div>
              </div>
            </div>

            {/* Comments temporarily removed */}
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
        <Select value={selectedFilter} onValueChange={handleFilterChange}>
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

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {startIndex + 1}-
        {Math.min(startIndex + ITEMS_PER_PAGE, sortedProposals.length)} of{" "}
        {sortedProposals.length} proposals
      </div>

      {/* Proposals List */}
      <ProposalsList
        proposals={paginatedProposals}
        getProposalTypeIcon={getProposalTypeIcon}
        getProposalTypeColor={getProposalTypeColor}
        getStatusColor={getStatusColor}
        getUpvotes={getUpvotes}
        getDownvotes={getDownvotes}
        onProposalClick={handleProposalClick}
        onVote={handleVote}
        isVoting={isVoting}
        getUserVote={getUserVote}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="flex items-center gap-2"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
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
  onProposalClick,
  onVote,
  isVoting,
  getUserVote,
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
                  <ArrowUp className="h-4 w-4" />
                  <span>{getUpvotes(proposal)}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <ArrowDown className="h-4 w-4" />
                  <span>{getDownvotes(proposal)}</span>
                </div>
              </div>
            </div>

            {/* Voting Buttons */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex space-x-3">
                <Button
                  variant={
                    getUserVote(proposal.id) === "UPVOTE"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVote(proposal.id, "UPVOTE");
                  }}
                  disabled={isVoting}
                  className="flex items-center space-x-2"
                >
                  <ArrowUp className="h-4 w-4" />
                  <span>Upvote</span>
                </Button>
                <Button
                  variant={
                    getUserVote(proposal.id) === "DOWNVOTE"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVote(proposal.id, "DOWNVOTE");
                  }}
                  disabled={isVoting}
                  className="flex items-center space-x-2"
                >
                  <ArrowDown className="h-4 w-4" />
                  <span>Downvote</span>
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Total: {getUpvotes(proposal) + getDownvotes(proposal)}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
