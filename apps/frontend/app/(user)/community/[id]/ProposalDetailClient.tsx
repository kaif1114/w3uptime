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
import { ProposalComments } from "@/components/ui/proposal-comments";
import { ProposalDetailSkeleton } from "@/components/ui/proposal-skeleton";
import { useProposal, useVoteProposal } from "@/hooks/useProposals";
import { useSession } from "@/hooks/useSession";
import {
  ProposalType,
  VoteType
} from "@/types/proposal";
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

  const proposal = proposalData?.proposal;

  const handleVote = async (vote: VoteType) => {
    try {
      await voteProposal.mutateAsync({
        proposalId,
        vote: { vote },
      });
    } catch (error) {
      console.error("Failed to vote:", error);
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
    return (
      proposal?.votes?.filter((vote) => vote.vote === VoteType.UPVOTE).length ||
      0
    );
  };

  const getDownvotes = () => {
    return (
      proposal?.votes?.filter((vote) => vote.vote === VoteType.DOWNVOTE)
        .length || 0
    );
  };

  const getUserVote = () => {
    if (!session?.user?.id || !proposal?.votes) {
      return null;
    }

    const userVote = proposal.votes.find(
      (vote) => vote.userId === session.user.id
    );
    return userVote ? userVote.vote : null;
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
            Vote on this proposal to show your support or concerns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <Button
                variant={
                  getUserVote() === VoteType.UPVOTE ? "default" : "outline"
                }
                size="lg"
                onClick={() => handleVote(VoteType.UPVOTE)}
                disabled={voteProposal.isPending}
                className="flex items-center space-x-2"
              >
                <ArrowUp className="h-5 w-5" />
                <span>Upvote ({getUpvotes()})</span>
              </Button>
              <Button
                variant={
                  getUserVote() === VoteType.DOWNVOTE ? "default" : "outline"
                }
                size="lg"
                onClick={() => handleVote(VoteType.DOWNVOTE)}
                disabled={voteProposal.isPending}
                className="flex items-center space-x-2"
              >
                <ArrowDown className="h-5 w-5" />
                <span>Downvote ({getDownvotes()})</span>
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Total votes: {getUpvotes() + getDownvotes()}
            </div>
          </div>
        </CardContent>
      </Card>

      
      <ProposalComments proposalId={proposalId} />
    </div>
  );
}
