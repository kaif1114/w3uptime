import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProposalDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back Button Skeleton */}
      <div className="flex items-center space-x-2">
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Proposal Header Skeleton */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-20" />
              </div>
              <div className="flex space-x-2">
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
            <div>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full mt-2" />
            </div>

            {/* Tags Skeleton */}
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-14" />
              </div>
            </div>

            {/* Meta Information Skeleton */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Voting Section Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex space-x-4">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="h-12 w-32" />
            </div>
            <Skeleton className="h-4 w-24" />
          </div>
        </CardContent>
      </Card>

      {/* Comments Section Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Comment Skeleton */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-full" />
          </div>

          {/* Another Comment Skeleton */}
          <div className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
            <Skeleton className="h-4 w-3/4" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
