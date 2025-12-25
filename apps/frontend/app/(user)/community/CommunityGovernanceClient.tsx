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
import { ProposalComments } from "@/components/ui/ProposalComments";
import {
  ProposalCardSkeleton,
  ProposalDetailSkeleton,
} from "@/components/ui/ProposalSkeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProposals, useVoteProposal } from "@/hooks/useProposals";
import { useSession } from "@/hooks/useSession";
import { useReputation } from "@/hooks/useReputation";
import { useVote } from "@/hooks/useVote";
import { useRouter } from "next/navigation";
import {
  Proposal,
  ProposalType,
  VoteType,
  ProposalFilters,
  OnChainStatus
} from "@/types/proposal";
import {
  getUpvoteCount,
  getDownvoteCount,
  getUserVote as getProposalUserVote
} from "@/lib/governance/VoteHelpers";
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
  
}

export function CommunityGovernanceClient({}: CommunityGovernanceClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [voteErrorMessage, setVoteErrorMessage] = useState<string | null>(null);

  
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

  
  const {
    data: proposalsData,
    isLoading,
    error,
  } = useProposals(getApiFilters());
  const voteProposal = useVoteProposal();
  const { data: session } = useSession();
  const {
    data: reputation,
    isLoading: isReputationLoading,
    error: reputationError,
  } = useReputation();
  const {
    vote: onChainVote,
    isLoading: isVotingOnChain,
  } = useVote();

  
  const proposals = proposalsData?.data || [];
  const total = proposalsData?.total || 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  
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
      // Find the proposal to check its onChainStatus
      const proposal = proposals.find((p) => p.id === proposalId);

      console.log("=== COMMUNITY PAGE VOTE DEBUG ===");
      console.log("Proposal:", {
        id: proposalId,
        onChainStatus: proposal?.onChainStatus,
        onChainId: proposal?.onChainId,
      });

      const isOnChainProposal =
        proposal?.onChainStatus === OnChainStatus.ACTIVE ||
        proposal?.onChainStatus === OnChainStatus.PASSED ||
        proposal?.onChainStatus === OnChainStatus.FAILED;

      console.log("Is on-chain proposal?", isOnChainProposal);

      if (isOnChainProposal) {
        // On-chain voting via MetaMask
        if (!proposal?.onChainId) {
          throw new Error("On-chain proposal ID not found");
        }

        console.log(`✅ Routing to ON-CHAIN vote for proposal ${proposal.onChainId}: ${vote}`);

        const support = vote === VoteType.UPVOTE;
        await onChainVote({
          proposalId: proposal.onChainId,
          support,
        });

        console.log("✅ On-chain vote successful");
      } else {
        // Database voting for DRAFT proposals
        console.log(`⚠️ Routing to DATABASE vote for proposal ${proposalId}: ${vote}`);

        await voteProposal.mutateAsync({
          proposalId,
          vote: { vote },
        });

        console.log("✅ Database vote successful");
      }

      setVoteErrorMessage(null);
    } catch (error) {
      console.error("Failed to vote:", error);
      const message =
        error instanceof Error ? error.message : String(error);

      if (message.includes("Insufficient reputation to vote on proposals")) {
        setVoteErrorMessage(
          "Your reputation score is too low to vote on proposals."
        );
      } else if (message.includes("This proposal requires on-chain voting")) {
        setVoteErrorMessage(
          "This proposal requires on-chain voting via MetaMask. Please connect your wallet."
        );
      } else {
        setVoteErrorMessage("Failed to vote. Please try again later.");
      }
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
    return getUpvoteCount(proposal);
  };

  const getDownvotes = (proposal: Proposal) => {
    return getDownvoteCount(proposal);
  };

  const getUserVote = (proposal: Proposal) => {
    if (!session?.user) return null;
    return getProposalUserVote(
      proposal,
      session.user.id,
      session.user.walletAddress
    );
  };

  
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

        {voteErrorMessage && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-gray-200">
              {voteErrorMessage}
            </AlertDescription>
          </Alert>
        )}

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

              
              <div className=" rounded-lg">
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
                      disabled={voteProposal.isPending || isVotingOnChain}
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
                      disabled={voteProposal.isPending || isVotingOnChain}
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

              
              <ProposalComments proposalId={selectedProposal.id} />
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  
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
      <div className="border-t border-border/50 my-6" />

      {session?.user && !reputationError && (
        <Card>
          <CardHeader>
            <CardTitle>Your community reputation</CardTitle>
            <CardDescription>
              This score influences your ability to create, comment on, and vote
              on proposals.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* On-Chain Balance */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">On-Chain Balance</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-semibold">
                    {isReputationLoading || !reputation
                      ? "—"
                      : reputation.onChainBalance === null
                      ? "N/A"
                      : reputation.onChainBalance}
                  </span>
                  <span className="text-sm text-muted-foreground">points</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Available to use for governance
                </p>
              </div>

              {/* Available to Claim */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Available to Claim</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-semibold">
                    {isReputationLoading || !reputation
                      ? "—"
                      : reputation.available}
                  </span>
                  <span className="text-sm text-muted-foreground">points</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ready to claim on-chain
                </p>
              </div>

              {/* All-Time Earned */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">All-Time Earned</p>
                <div className="flex items-baseline space-x-2">
                  <span className="text-2xl font-semibold">
                    {isReputationLoading || !reputation
                      ? "—"
                      : reputation.totalScore}
                  </span>
                  <span className="text-sm text-muted-foreground">points</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Total reputation earned
                </p>
              </div>
            </div>

            {reputation && (
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  Create proposal:{" "}
                  <span className="font-medium">
                    {reputation.thresholds.createProposal}+ points required
                  </span>
                </div>
                <div>
                  Comment:{" "}
                  <span className="font-medium">
                    {reputation.thresholds.comment}+ points required
                  </span>
                </div>
                <div>
                  Vote:{" "}
                  <span className="font-medium">
                    {reputation.thresholds.vote}+ points required
                  </span>
                </div>
              </div>
            )}

            <Link href="/community/reputation">
              <Button className="w-full" variant="outline">
                Manage Reputation
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {voteErrorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-gray-200">
            {voteErrorMessage}
          </AlertDescription>
        </Alert>
      )}

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

      
      <div className="text-sm text-muted-foreground">
        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
        {Math.min(currentPage * ITEMS_PER_PAGE, total)} of {total} proposals
      </div>

      
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
          isVoting={voteProposal.isPending || isVotingOnChain}
          getUserVote={getUserVote}
        />
      )}

      
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
