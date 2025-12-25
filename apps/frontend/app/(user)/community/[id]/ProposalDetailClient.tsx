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
import { ProposalComments } from "@/components/ui/ProposalComments";
import { ProposalDetailSkeleton } from "@/components/ui/ProposalSkeleton";
import { useProposal, useVoteProposal } from "@/hooks/useProposals";
import { useVote } from "@/hooks/useVote";
import { useSession } from "@/hooks/useSession";
import { useOnChainReputation } from "@/hooks/useOnChainReputation";
import {
  ProposalType,
  VoteType,
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
  Edit,
  Lightbulb,
  Settings,
  Tag,
  Trash2,
  User,
  Shield,
  Loader2,
  CheckCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface ProposalDetailClientProps {
  proposalId: string;
}

export function ProposalDetailClient({
  proposalId,
}: ProposalDetailClientProps) {
  const { data: proposalData, isLoading, error } = useProposal(proposalId);
  const voteProposal = useVoteProposal();
  const { data: session } = useSession();
  const {
    data: reputationData,
    isLoading: isLoadingReputation,
  } = useOnChainReputation();
  const {
    vote: onChainVote,
    isLoading: isVotingOnChain,
    error: voteError,
    isSuccess: voteSuccess,
    data: voteData,
  } = useVote();

  const proposal = proposalData?.proposal;

  const handleVote = async (vote: VoteType) => {
    try {
      // Enhanced debugging
      console.log("=== VOTE DEBUG START ===");
      console.log("Proposal data:", {
        id: proposal?.id,
        onChainStatus: proposal?.onChainStatus,
        onChainId: proposal?.onChainId,
        typeOf_onChainStatus: typeof proposal?.onChainStatus,
      });

      const isOnChainProposal =
        proposal?.onChainStatus === OnChainStatus.ACTIVE ||
        proposal?.onChainStatus === OnChainStatus.PASSED ||
        proposal?.onChainStatus === OnChainStatus.FAILED;

      console.log("Is on-chain proposal?", isOnChainProposal);
      console.log("Comparison results:", {
        isActive: proposal?.onChainStatus === OnChainStatus.ACTIVE,
        isPassed: proposal?.onChainStatus === OnChainStatus.PASSED,
        isFailed: proposal?.onChainStatus === OnChainStatus.FAILED,
      });

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
      console.log("=== VOTE DEBUG END ===");
    } catch (error) {
      console.error("Failed to vote:", error);
      // Error handling is done by the hook
    }
  };

  

  const getProposalTypeIcon = (type: ProposalType) => {
    return type === ProposalType.FEATURE_REQUEST ? (
      <Lightbulb className="h-5 w-5 text-blue-500" />
    ) : (
      <Settings className="h-5 w-5 text-green-500" />
    );
  };

  const getProposalTypeColor = (type: ProposalType) => {
    return type === ProposalType.FEATURE_REQUEST
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
    if (!proposal) return 0;
    return getUpvoteCount(proposal);
  };

  const getDownvotes = () => {
    if (!proposal) return 0;
    return getDownvoteCount(proposal);
  };

  const getUserVote = () => {
    if (!proposal || !session?.user) return null;
    return getProposalUserVote(
      proposal,
      session.user.id,
      session.user.walletAddress
    );
  };

  const canVote = () => {
    if (!proposal) return false;
    if (!session?.user) return false;

    // Can't vote on finalized proposals
    if (
      proposal.onChainStatus === OnChainStatus.PASSED ||
      proposal.onChainStatus === OnChainStatus.FAILED
    ) {
      return false;
    }

    // Can't vote while transaction is pending
    if (proposal.onChainStatus === OnChainStatus.PENDING_ONCHAIN) {
      return false;
    }

    // Can vote on DRAFT (database) or ACTIVE (on-chain)
    return (
      proposal.onChainStatus === OnChainStatus.DRAFT || proposal.onChainStatus === OnChainStatus.ACTIVE
    );
  };

  const getVoteDisabledReason = () => {
    if (!session?.user) return "Please sign in to vote";
    if (!proposal) return null;

    if (proposal.onChainStatus === OnChainStatus.PASSED) {
      return "This proposal has passed and voting is closed";
    }
    if (proposal.onChainStatus === OnChainStatus.FAILED) {
      return "This proposal has failed and voting is closed";
    }
    if (proposal.onChainStatus === OnChainStatus.PENDING_ONCHAIN) {
      return "Waiting for on-chain confirmation. Voting will be available shortly.";
    }

    // Check if voting period ended for ACTIVE proposals
    if (proposal.onChainStatus === OnChainStatus.ACTIVE && proposal.votingEndsAt) {
      const now = new Date();
      const endsAt = new Date(proposal.votingEndsAt);
      if (now >= endsAt) {
        return "Voting period has ended. Waiting for finalization.";
      }
    }

    return null;
  };

  const getVotingMethod = () => {
    if (!proposal) return "Unknown";

    if (proposal.onChainStatus === OnChainStatus.DRAFT) {
      return "Database Voting";
    }
    if (proposal.onChainStatus === OnChainStatus.ACTIVE) {
      return "On-Chain Voting (MetaMask)";
    }
    return "Voting Closed";
  };


  if (isLoading) {
    return <ProposalDetailSkeleton />;
  }

  
  if (error) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Link href="/community">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Proposals
            </Button>
          </Link>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load proposal. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  
  if (!proposal) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Link href="/community">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Proposals
            </Button>
          </Link>
        </div>
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Proposal Not Found</h1>
          <p className="text-muted-foreground">
            The proposal you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      <div className="flex items-center space-x-2">
        <Link href="/community">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Proposals
          </Button>
        </Link>
      </div>

      
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getProposalTypeIcon(proposal.type)}
                <Badge
                  variant="secondary"
                  className={getProposalTypeColor(proposal.type)}
                >
                  {proposal.type === ProposalType.FEATURE_REQUEST
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
              <CardTitle className="text-2xl">{proposal.title}</CardTitle>
              <CardDescription className="text-base mt-2">
                {proposal.description}
              </CardDescription>
            </div>

            
            {proposal.tags && proposal.tags.length > 0 && (
              <div className="flex items-center space-x-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-2">
                  {proposal.tags.map((tag, index) => (
                    <Badge key={index} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            
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
                    Created {new Date(proposal.createdAt).toLocaleDateString()}
                  </span>
                </div>
                {proposal.updatedAt !== proposal.createdAt && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Updated{" "}
                      {new Date(proposal.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>


      <Card>
        <CardHeader>
          <CardTitle>Community Feedback</CardTitle>
          <CardDescription>
            {proposal?.onChainStatus === OnChainStatus.ACTIVE
              ? "Vote directly on the Sepolia blockchain via MetaMask (gas fees apply)"
              : proposal?.onChainStatus === OnChainStatus.DRAFT
              ? "Vote on this proposal to show your support or concerns"
              : "Voting has ended for this proposal"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* On-chain voting indicator */}
            {proposal?.onChainStatus === OnChainStatus.ACTIVE && (
              <Alert className="border-blue-200 bg-blue-50">
                <Shield className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>On-Chain Voting:</strong> Your vote will be
                  permanently recorded on the Sepolia blockchain. Transaction
                  requires gas fees (~0.001 ETH).
                </AlertDescription>
              </Alert>
            )}

            {/* Voting error display */}
            {voteError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{voteError}</AlertDescription>
              </Alert>
            )}

            {/* Voting success display */}
            {voteSuccess && voteData && (
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Vote recorded successfully!{" "}
                  <a
                    href={`https://sepolia.etherscan.io/tx/${voteData.transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline font-mono"
                  >
                    View transaction
                  </a>
                </AlertDescription>
              </Alert>
            )}

            {/* Reputation Check Warning for On-Chain Voting */}
            {proposal?.onChainStatus === OnChainStatus.ACTIVE &&
              reputationData &&
              !reputationData.canVote && (
                <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                  <AlertCircle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="ml-2 space-y-2">
                    <p className="font-medium text-orange-900 dark:text-orange-100">
                      Insufficient On-Chain Reputation to Vote
                    </p>
                    <div className="text-sm text-orange-800 dark:text-orange-200">
                      <p>
                        Required: 50 REP | Your Balance:{" "}
                        {reputationData.onChainBalance ?? 0} REP
                      </p>
                      {reputationData.availableToClaimPoints > 0 && (
                        <p className="font-medium mt-1">
                          Available to Claim:{" "}
                          {reputationData.availableToClaimPoints} REP
                        </p>
                      )}
                    </div>
                    <Link
                      href="/community/reputation"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
                    >
                      Claim Your Reputation <ExternalLink className="h-3 w-3" />
                    </Link>
                  </AlertDescription>
                </Alert>
              )}

            {/* Vote buttons */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-4">
                <Button
                  variant={
                    getUserVote() === VoteType.UPVOTE ? "default" : "outline"
                  }
                  size="lg"
                  onClick={() => handleVote(VoteType.UPVOTE)}
                  disabled={
                    voteProposal.isPending ||
                    isVotingOnChain ||
                    !canVote() ||
                    isLoadingReputation ||
                    (proposal?.onChainStatus === OnChainStatus.ACTIVE &&
                      reputationData &&
                      !reputationData.canVote)
                  }
                  className="flex items-center space-x-2"
                >
                  {isVotingOnChain && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <ArrowUp className="h-5 w-5" />
                  <span>
                    {isLoadingReputation ? "..." : `Upvote (${getUpvotes()})`}
                  </span>
                </Button>

                <Button
                  variant={
                    getUserVote() === VoteType.DOWNVOTE ? "default" : "outline"
                  }
                  size="lg"
                  onClick={() => handleVote(VoteType.DOWNVOTE)}
                  disabled={
                    voteProposal.isPending ||
                    isVotingOnChain ||
                    !canVote() ||
                    isLoadingReputation ||
                    (proposal?.onChainStatus === OnChainStatus.ACTIVE &&
                      reputationData &&
                      !reputationData.canVote)
                  }
                  className="flex items-center space-x-2"
                >
                  {isVotingOnChain && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  <ArrowDown className="h-5 w-5" />
                  <span>
                    {isLoadingReputation ? "..." : `Downvote (${getDownvotes()})`}
                  </span>
                </Button>
              </div>

              <div className="text-sm text-muted-foreground">
                Total votes: {getUpvotes() + getDownvotes()}
              </div>
            </div>

            {/* Disabled reason tooltip */}
            {getVoteDisabledReason() && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{getVoteDisabledReason()}</AlertDescription>
              </Alert>
            )}

            {/* Voting method info */}
            <div className="text-xs text-muted-foreground flex items-center space-x-2">
              <span>Method:</span>
              <Badge variant="outline" className="text-xs">
                {getVotingMethod()}
              </Badge>
            </div>

            {/* Transaction pending state */}
            {isVotingOnChain && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <Loader2 className="h-4 w-4 animate-spin text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  <strong>Transaction Pending...</strong> Please confirm the
                  transaction in MetaMask. Do not close this window.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      
      <ProposalComments proposalId={proposalId} />
    </div>
  );
}
