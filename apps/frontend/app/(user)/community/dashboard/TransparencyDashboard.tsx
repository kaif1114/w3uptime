"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Shield,
  ExternalLink,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  TrendingUp,
  FileText,
  RefreshCw,
} from "lucide-react";
import { OnChainBadge } from "@/components/ui/OnChainBadge";
import Link from "next/link";

interface DashboardProposal {
  id: string;
  title: string;
  type: string;
  status: string;
  onChainStatus: string;
  proposer: string;
  createdAt: string;
  onChainId: number | null;
  creationTxHash: string | null;
  creationTxUrl: string | null;
  finalizationTxHash: string | null;
  finalizationTxUrl: string | null;
  votingEndsAt: string | null;
  onChainVotes: {
    upvotes: number;
    downvotes: number;
    total: number;
  };
}

interface DashboardStats {
  totalProposals: number;
  onChainProposals: number;
  finalizedProposals: number;
  activeVoting: number;
}

interface DashboardData {
  proposals: DashboardProposal[];
  stats: DashboardStats;
}

export function TransparencyDashboard() {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Fetch dashboard data
  const {
    data,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<DashboardData>({
    queryKey: ["governance-dashboard"],
    queryFn: async () => {
      const response = await fetch("/api/proposals/dashboard", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dashboard data");
      }

      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds for live data
    staleTime: 20000, // Consider data stale after 20 seconds
  });

  const handleExport = () => {
    window.open("/api/proposals/export", "_blank");
  };

  const filteredProposals = data?.proposals.filter((p) => {
    if (statusFilter === "all") return true;
    return p.onChainStatus === statusFilter;
  });

  if (error) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load transparency dashboard. Please try again later.
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">
            Governance Transparency Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            All on-chain proposals with blockchain verification and voting data
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            disabled={isRefetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Proposals
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.stats.totalProposals}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All governance proposals
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On-Chain</CardTitle>
              <Shield className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.stats.onChainProposals}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Blockchain verified
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Voting
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.stats.activeVoting}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Currently accepting votes
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Finalized</CardTitle>
              <CheckCircle className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.stats.finalizedProposals}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Voting completed
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Proposals Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>On-Chain Proposals</CardTitle>
              <CardDescription>
                Filter and view all blockchain-verified proposals
              </CardDescription>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="PASSED">Passed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="PENDING_ONCHAIN">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProposals && filteredProposals.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Title</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Votes (↑/↓)</TableHead>
                    <TableHead>Proposer</TableHead>
                    <TableHead>Creation Tx</TableHead>
                    <TableHead>Finalization Tx</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProposals.map((proposal) => (
                    <TableRow key={proposal.id}>
                      <TableCell className="font-medium max-w-xs">
                        <Link
                          href={`/community/${proposal.id}`}
                          className="hover:underline text-blue-600"
                        >
                          {proposal.title}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <OnChainBadge
                          onChainStatus={proposal.onChainStatus}
                          txHash={proposal.creationTxHash}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            ↑ {proposal.onChainVotes.upvotes}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="bg-red-50 text-red-700 border-red-200"
                          >
                            ↓ {proposal.onChainVotes.downvotes}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {proposal.proposer
                          ? `${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}`
                          : "N/A"}
                      </TableCell>
                      <TableCell>
                        {proposal.creationTxUrl ? (
                          <a
                            href={proposal.creationTxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-blue-600 hover:underline"
                          >
                            <span className="font-mono text-xs">
                              {proposal.creationTxHash?.slice(0, 8)}...
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {proposal.finalizationTxUrl ? (
                          <a
                            href={proposal.finalizationTxUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1 text-blue-600 hover:underline"
                          >
                            <span className="font-mono text-xs">
                              {proposal.finalizationTxHash?.slice(0, 8)}...
                            </span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Link href={`/community/${proposal.id}`}>
                          <Button variant="ghost" size="sm">
                            View Details
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                No proposals found for the selected filter.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Verification Info */}
      <Alert className="border-blue-200 bg-blue-50">
        <Shield className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Blockchain Verification:</strong> All on-chain proposals are
          immutably recorded on Sepolia testnet. Click the transaction links to
          verify data on Etherscan independently. Export the complete dataset
          for third-party auditing.
        </AlertDescription>
      </Alert>
    </div>
  );
}
