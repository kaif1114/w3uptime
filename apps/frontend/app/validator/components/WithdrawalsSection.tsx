"use client";

import { useState } from "react";
import { WithdrawalRequest } from "@/types/validator";
import {
  useWithdrawals,
  useCreateWithdrawal,
  useGetWithdrawalSignature
} from "@/hooks/useWithdrawals";
import { useExecuteWithdrawal } from "@/hooks/useWithdrawalExecution";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Wallet,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  ArrowUpRight,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export default function WithdrawalsSection() {
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [currentPage] = useState(1);
  const [executingWithdrawalId, setExecutingWithdrawalId] = useState<string | null>(null);
  const [executionProgress, setExecutionProgress] = useState<string>("");

  
  const { data: withdrawalsData, isLoading, error } = useWithdrawals(currentPage, 10);
  
  
  const createWithdrawalMutation = useCreateWithdrawal();
  const getSignatureMutation = useGetWithdrawalSignature();
  const executeWithdrawalMutation = useExecuteWithdrawal();

  const withdrawals = withdrawalsData?.withdrawals || [];

  const getStatusBadge = (status: WithdrawalRequest["status"]) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant="default"
            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case "pending":
        return (
          <Badge
            variant="secondary"
            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
          >
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleWithdrawalRequest = async () => {
    const amount = parseFloat(withdrawalAmount);
    if (amount > 0) {
      try {
        const result = await createWithdrawalMutation.mutateAsync(amount);
        toast.success("Withdrawal request created successfully");
        setWithdrawalAmount("");
        setIsWithdrawalDialogOpen(false);
        
        
        setTimeout(() => {
          handleExecuteWithdrawal(result.withdrawalId);
        }, 1000);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Failed to create withdrawal request";
        toast.error(errorMessage);
      }
    }
  };

  const handleExecuteWithdrawal = async (withdrawalId: string) => {
    try {
      setExecutingWithdrawalId(withdrawalId);
      setExecutionProgress("Getting withdrawal signature...");

      
      const signature = await getSignatureMutation.mutateAsync(withdrawalId);
      
      
      setExecutionProgress("Executing withdrawal...");
      await executeWithdrawalMutation.mutateAsync({
        withdrawalId,
        signature,
        onProgress: setExecutionProgress
      });

      toast.success("Withdrawal executed successfully!");
      setExecutingWithdrawalId(null);
      setExecutionProgress("");
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to execute withdrawal";
      toast.error(errorMessage);
      setExecutingWithdrawalId(null);
      setExecutionProgress("");
    }
  };

  return (
    <div className="space-y-6">
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Request Withdrawal
          </CardTitle>
          <CardDescription>
            Request a withdrawal from your available balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog
            open={isWithdrawalDialogOpen}
            onOpenChange={setIsWithdrawalDialogOpen}
          >
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Request Withdrawal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
                <DialogDescription>
                  Enter the amount you want to withdraw from your available
                  balance.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="amount" className="text-right">
                    Amount (ETH)
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.0001"
                    min="0"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    className="col-span-3"
                    placeholder="0.0000"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsWithdrawalDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleWithdrawalRequest}
                  disabled={
                    !withdrawalAmount ||
                    parseFloat(withdrawalAmount) <= 0 ||
                    createWithdrawalMutation.isPending
                  }
                >
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  {createWithdrawalMutation.isPending ? "Processing..." : "Request Withdrawal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>
            Track your withdrawal requests and their status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="text-center py-8 text-muted-foreground">
              <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Failed to load withdrawals</p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50 animate-spin" />
              <p>Loading withdrawals...</p>
            </div>
          ) : withdrawals.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No withdrawal requests yet</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead>Processed</TableHead>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals.map((withdrawal) => (
                    <TableRow key={withdrawal.id}>
                      <TableCell className="font-mono text-sm">
                        {withdrawal.id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {withdrawal.amount.toFixed(4)} ETH
                      </TableCell>
                      <TableCell>{getStatusBadge(withdrawal.status)}</TableCell>
                      <TableCell>
                        {format(
                          new Date(withdrawal.requestedAt),
                          "MMM dd, yyyy"
                        )}
                      </TableCell>
                      <TableCell>
                        {withdrawal.processedAt
                          ? format(
                              new Date(withdrawal.processedAt),
                              "MMM dd, yyyy"
                            )
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {withdrawal.transactionHash ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => window.open(`https://sepolia.etherscan.io/tx/${withdrawal.transactionHash}`, '_blank')}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        {withdrawal.status === 'pending' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExecuteWithdrawal(withdrawal.id)}
                            disabled={executingWithdrawalId === withdrawal.id}
                          >
                            {executingWithdrawalId === withdrawal.id ? (
                              <>
                                <Clock className="h-3 w-3 mr-1 animate-spin" />
                                {executionProgress || "Processing..."}
                              </>
                            ) : (
                              <>
                                <ArrowUpRight className="h-3 w-3 mr-1" />
                                Execute
                              </>
                            )}
                          </Button>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
