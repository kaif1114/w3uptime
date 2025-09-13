"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProposalComments } from "@/components/ui/proposal-comments";
import {
  ProposalCardSkeleton,
  ProposalDetailSkeleton,
} from "@/components/ui/proposal-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProposals, useVoteProposal } from "@/hooks/useProposals";
import { useSession } from "@/hooks/useSession";
import {
  Proposal,
  ProposalType,
  VoteType,
  ProposalFilters
} from "@/types/proposal";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Settings,
  User
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const ITEMS_PER_PAGE = 5;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CommunityGovernanceClientProps {
  // Props can be added here as needed
}

export function CommunityGovernanceClient({}: CommunityGovernanceClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);

  // Convert filter to API parameters
  const getApiFilters = (): ProposalFilters => {
    const filters: ProposalFilters = {
      page: currentPage,
      pageSize: ITEMS_PER_PAGE,
    };

    if (searchQuery) {
      filters.q = searchQuery;
    }

    if (selectedFilter === "feature") {
      filters.type = ProposalType.FEATURE_REQUEST;
    } else if (selectedFilter === "change") {
      filters.type = ProposalType.CHANGE_REQUEST;
    }

    return filters;
  };

  // Fetch proposals using the hook
  const {
    data: proposalsData,
    isLoading,
    error,
  } = useProposals(getApiFilters());
  const voteProposal = useVoteProposal();
  const { data: session } = useSession();

  // Use fetched data
  const proposals = proposalsData?.data || [];
  const total = proposalsData?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  // Reset to first page when search or filter changes
  const handleSearch = () => {
    setCurrentPage(1);
  };

  const handleFilterChange = (value: string) => {
    setSelectedFilter(value);
    setCurrentPage(1);
  };

  const handleProposalClick = (proposal: Proposal) => {
    setSelectedProposal(proposal);
  };

  const handleBackToList = () => {
    setSelectedProposal(null);
  };

  const handleVote = async (proposalId: string, vote: VoteType) => {
    try {
      await voteProposal.mutateAsync({
        proposalId,
        vote: { vote },
      });
    } catch (error) {
      console.error("Failed to vote:", error);
    }
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

  const getUpvotes = (proposal: Proposal) => {
    return (
      proposal.votes?.filter((vote) => vote.vote === VoteType.UPVOTE).length ||
      0
    );
  };

  const getDownvotes = (proposal: Proposal) => {
    return (
      proposal.votes?.filter((vote) => vote.vote === VoteType.DOWNVOTE)
        .length || 0
    );
  };

  const getUserVote = (proposal: Proposal) => {
    if (!session?.user?.id || !proposal?.votes) {
      return null;
    }

    const userVote = proposal.votes.find(
      (vote) => vote.userId === session.user.id
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

        {isLoading ? (
          <ProposalDetailSkeleton />
        ) : (
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

                  {selectedProposal.tags &&
                    selectedProposal.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {selectedProposal.tags.map(
                          (tag: string, index: number) => (
                            <Badge
                              key={index}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          )
                        )}
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
                      {new Date(
                        selectedProposal.createdAt
                      ).toLocaleDateString()}
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
                        getUserVote(selectedProposal) === VoteType.UPVOTE
                          ? "default"
                          : "outline"
                      }
                      size="lg"
                      onClick={() =>
                        handleVote(selectedProposal.id, VoteType.UPVOTE)
                      }
                      disabled={voteProposal.isPending}
                      className="flex items-center space-x-2"
                    >
                      <ArrowUp className="h-5 w-5" />
                      <span>Upvote</span>
                    </Button>
                    <Button
                      variant={
                        getUserVote(selectedProposal) === VoteType.DOWNVOTE
                          ? "default"
                          : "outline"
                      }
                      size="lg"
                      onClick={() =>
                        handleVote(selectedProposal.id, VoteType.DOWNVOTE)
                      }
                      disabled={voteProposal.isPending}
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

              {/* Comments Section */}
              <ProposalComments proposalId={selectedProposal.id} />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="space-y-4">
        <div className="border-t border-border/50 my-6" />
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load proposals. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Separator */}
      <div className="border-t border-border/50 my-6" />

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
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
        {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} proposals
      </div>

      {/* Proposals List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: ITEMS_PER_PAGE }).map((_, index) => (
            <ProposalCardSkeleton key={index} />
          ))}
        </div>
      ) : (
        <ProposalsList
          proposals={proposals}
          getProposalTypeIcon={getProposalTypeIcon}
          getProposalTypeColor={getProposalTypeColor}
          getStatusColor={getStatusColor}
          getUpvotes={getUpvotes}
          getDownvotes={getDownvotes}
          onProposalClick={handleProposalClick}
          onVote={handleVote}
          isVoting={voteProposal.isPending}
          getUserVote={getUserVote}
        />
      )}

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

interface ProposalsListProps {
  proposals: Proposal[];
  getProposalTypeIcon: (type: string) => React.ReactNode;
  getProposalTypeColor: (type: string) => string;
  getStatusColor: (status: string) => string;
  getUpvotes: (proposal: Proposal) => number;
  getDownvotes: (proposal: Proposal) => number;
  onProposalClick: (proposal: Proposal) => void;
  onVote: (proposalId: string, vote: VoteType) => void;
  isVoting: boolean;
  getUserVote: (proposal: Proposal) => VoteType | null;
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
}: ProposalsListProps) {
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
      {proposals.map((proposal) => (
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
                    getUserVote(proposal) === VoteType.UPVOTE
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVote(proposal.id, VoteType.UPVOTE);
                  }}
                  disabled={isVoting}
                  className="flex items-center space-x-2"
                >
                  <ArrowUp className="h-4 w-4" />
                  <span>Upvote</span>
                </Button>
                <Button
                  variant={
                    getUserVote(proposal) === VoteType.DOWNVOTE
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVote(proposal.id, VoteType.DOWNVOTE);
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
