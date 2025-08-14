"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  useEscalationPolicies,
  useBulkDeleteEscalationPolicies,
  FetchEscalationPoliciesParams,
} from "@/hooks/useEscalationPolicies";
import {
  Plus,
  Search,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertTriangle,
  Mail,
  MessageSquare,
  Webhook,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Users,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EscalationMethod, EscalationPolicy } from "@/types/escalation-policy";
// Simple toast replacement - you can install sonner or use your preferred toast library
const toast = {
  success: (message: string) => {
    alert(`✅ ${message}`);
  },
  error: (message: string) => {
    alert(`❌ ${message}`);
  },
  warning: (message: string) => {
    alert(`⚠️ ${message}`);
  },
};

const methodIcons = {
  EMAIL: Mail,
  SLACK: MessageSquare,
  WEBHOOK: Webhook,
  email: Mail,
  slack: MessageSquare,
  webhook: Webhook,
};

const methodColors = {
  EMAIL: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  SLACK:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  WEBHOOK:
    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  email: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  slack:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
  webhook:
    "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
};

export function EscalationPoliciesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [selectedPolicies, setSelectedPolicies] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<EscalationPolicy | null>(
    null
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<"name" | "createdAt" | "updatedAt">(
    "createdAt"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Fetch policies with current filters
  const queryParams: FetchEscalationPoliciesParams = {
    page: currentPage,
    limit: pageSize,
    search: searchQuery,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, error, refetch } =
    useEscalationPolicies(queryParams);
  const bulkDeleteMutation = useBulkDeleteEscalationPolicies();

  const policies = data?.escalationPolicies || [];
  const pagination = data?.pagination;

  // Handle search input change
  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
  };

  // Handle search button click
  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle clear search
  const handleClearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // Handle Enter key press in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Handle sorting
  const handleSort = (field: "name" | "createdAt" | "updatedAt") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Handle selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPolicies(policies.map((p) => p.id));
    } else {
      setSelectedPolicies([]);
    }
  };

  const handleSelectPolicy = (policyId: string, checked: boolean) => {
    if (checked) {
      setSelectedPolicies([...selectedPolicies, policyId]);
    } else {
      setSelectedPolicies(selectedPolicies.filter((id) => id !== policyId));
    }
  };

  // Handle individual delete
  const handleDeleteClick = (policy: EscalationPolicy) => {
    setPolicyToDelete(policy);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!policyToDelete) return;

    try {
      await bulkDeleteMutation.mutateAsync([policyToDelete.id]);
      toast.success("Escalation policy deleted successfully");
      setDeleteDialogOpen(false);
      setPolicyToDelete(null);
    } catch (error: any) {
      toast.error(error.message || "Failed to delete escalation policy");
    }
  };

  // Handle bulk delete
  const handleBulkDeleteClick = () => {
    setBulkDeleteDialogOpen(true);
  };

  const handleBulkDeleteConfirm = async () => {
    try {
      await bulkDeleteMutation.mutateAsync(selectedPolicies);
      toast.success(
        `${selectedPolicies.length} escalation policies deleted successfully`
      );
      setSelectedPolicies([]);
      setBulkDeleteDialogOpen(false);
    } catch (error: any) {
      if (error.policiesInUse) {
        toast.error(
          `Cannot delete policies in use by monitors: ${error.policiesInUse
            .map((p: any) => p.name)
            .join(", ")}`
        );
      } else {
        toast.error(error.message || "Failed to delete escalation policies");
      }
    }
  };

  // Handle edit
  const handleEdit = (policyId: string) => {
    router.push(`/escalation-policies/${policyId}/edit`);
  };

  // Calculate pagination info
  const totalPages = pagination?.totalPages || 0;
  const isFirstPage = currentPage === 1;
  const isLastPage = currentPage === totalPages;

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Escalation Policies</h1>
            <p className="text-muted-foreground">
              Manage how incidents are escalated when not acknowledged
            </p>
          </div>
          <div className="h-10 w-32 bg-muted animate-pulse rounded-md" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="h-6 w-48 bg-muted animate-pulse rounded" />
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex items-center gap-4">
              <div className="flex gap-2 flex-1 max-w-md">
                <div className="relative flex-1">
                  <div className="absolute left-3 top-1/2 h-4 w-4 bg-muted animate-pulse rounded" />
                  <div className="h-10 bg-muted animate-pulse rounded-md pl-9" />
                </div>
                <div className="h-10 w-20 bg-muted animate-pulse rounded-md" />
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-8 bg-muted animate-pulse rounded" />
                <div className="h-10 w-16 bg-muted animate-pulse rounded-md" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="border-b">
                <div className="flex items-center h-12 px-4">
                  <div className="h-4 w-4 bg-muted animate-pulse rounded mr-4" />
                  <div className="h-4 w-24 bg-muted animate-pulse rounded mr-4" />
                  <div className="h-4 w-32 bg-muted animate-pulse rounded mr-4" />
                  <div className="h-4 w-20 bg-muted animate-pulse rounded mr-4" />
                  <div className="h-4 w-20 bg-muted animate-pulse rounded mr-4" />
                  <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                </div>
              </div>
              <div className="space-y-0">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center h-16 px-4 border-b last:border-b-0"
                  >
                    <div className="h-4 w-4 bg-muted animate-pulse rounded mr-4" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-muted animate-pulse rounded mb-2" />
                      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                    </div>
                    <div className="h-6 w-8 bg-muted animate-pulse rounded mr-4" />
                    <div className="h-4 w-20 bg-muted animate-pulse rounded mr-4" />
                    <div className="h-4 w-20 bg-muted animate-pulse rounded mr-4" />
                    <div className="h-8 w-8 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Escalation Policies</h1>
            <p className="text-muted-foreground">
              Manage how incidents are escalated when not acknowledged
            </p>
          </div>
          <Button asChild>
            <Link href="/escalation-policies/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Link>
          </Button>
        </div>

        <Card className="border-destructive">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <p className="text-destructive mb-2">
                Failed to load escalation policies
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                Please try refreshing the page or check your connection
              </p>
              <Button onClick={() => refetch()} variant="outline">
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Empty state
  if (!policies || policies.length === 0) {
    if (searchQuery) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Escalation Policies</h1>
              <p className="text-muted-foreground">
                Manage how incidents are escalated when not acknowledged
              </p>
            </div>
            <Button asChild>
              <Link href="/escalation-policies/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Policy
              </Link>
            </Button>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Escalation Policies</CardTitle>
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search policies..."
                    value={searchInput}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    className="pl-9"
                  />
                </div>
                <Button onClick={handleSearch} variant="default">
                  <Search className="h-4 w-4 mr-1" />
                  Search
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No policies found</h3>
                <p className="text-muted-foreground mb-4">
                  No escalation policies match your search for "{searchQuery}"
                </p>
                <Button onClick={handleClearSearch} variant="outline">
                  Clear search
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Escalation Policies</h1>
            <p className="text-muted-foreground">
              Manage how incidents are escalated when not acknowledged
            </p>
          </div>
          <Button asChild>
            <Link href="/escalation-policies/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Policy
            </Link>
          </Button>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center max-w-md">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">
                No escalation policies yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Create your first escalation policy to define how incidents
                should be handled when they are not acknowledged in time.
              </p>
              <Button asChild>
                <Link href="/escalation-policies/create">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Policy
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Escalation Policies</h1>
          <p className="text-muted-foreground">
            Manage how incidents are escalated when not acknowledged
          </p>
        </div>
        <Button asChild>
          <Link href="/escalation-policies/create">
            <Plus className="h-4 w-4 mr-2" />
            Create Policy
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{pagination?.totalCount} escalation policies</CardTitle>
            {selectedPolicies.length > 0 && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDeleteClick}
                disabled={bulkDeleteMutation.isPending}
              >
                {bulkDeleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete {selectedPolicies.length} selected
              </Button>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search policies..."
                  value={searchInput}
                  onChange={(e) => handleSearchInputChange(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  className="pl-9"
                />
              </div>
              <Button onClick={handleSearch} variant="default" size="sm">
                <Search className="h-4 w-4 mr-1" />
                Search
              </Button>
              {(searchQuery || searchInput) && (
                <Button onClick={handleClearSearch} variant="outline" size="sm">
                  Clear
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Show:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-3 py-2 border border-input bg-background rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 min-w-[70px]"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={
                        policies.length > 0 &&
                        selectedPolicies.length === policies.length
                      }
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("name")}
                      className="h-auto p-0 font-medium"
                    >
                      Name
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>Escalation Levels</TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("createdAt")}
                      className="h-auto p-0 font-medium"
                    >
                      Created
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort("updatedAt")}
                      className="h-auto p-0 font-medium"
                    >
                      Updated
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => {
                  const isSelected = selectedPolicies.includes(policy.id);
                  return (
                    <TableRow
                      key={policy.id}
                      className={isSelected ? "bg-muted/50" : ""}
                    >
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectPolicy(policy.id, checked as boolean)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{policy.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {policy.levels.length} level
                            {policy.levels.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {policy.levels.slice(0, 3).map((level, index) => {
                            const Icon =
                              methodIcons[
                                level.method as keyof typeof methodIcons
                              ];
                            return (
                              <Badge
                                key={level.id}
                                variant="secondary"
                                className={`text-xs ${
                                  methodColors[
                                    level.method as keyof typeof methodColors
                                  ]
                                }`}
                              >
                                {Icon && <Icon className="h-3 w-3 mr-1" />}
                                {index + 1}
                              </Badge>
                            );
                          })}
                          {policy.levels.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{policy.levels.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(policy.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(policy.updatedAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleEdit(policy.id)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDeleteClick(policy)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination && totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <div className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * pageSize + 1} to{" "}
                {Math.min(currentPage * pageSize, pagination.totalCount)} of{" "}
                {pagination.totalCount} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(1)}
                  disabled={isFirstPage}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={isFirstPage}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <Button
                        key={pageNum}
                        variant={
                          currentPage === pageNum ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handlePageChange(pageNum)}
                        className="w-8 h-8 p-0"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={isLastPage}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={isLastPage}
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Escalation Policy</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{policyToDelete?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={setBulkDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Selected Policies</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedPolicies.length} selected
              escalation policies? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Delete {selectedPolicies.length} policies
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
