import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProposalCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <div className="flex items-center space-x-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="flex items-center space-x-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-6" />
            </div>
            <div className="flex items-center space-x-1">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-6" />
            </div>
          </div>
        </div>

        
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex space-x-3">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
          </div>
          <Skeleton className="h-4 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ProposalDetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Skeleton className="h-8 w-32" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-3">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-20" />
              </div>
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />

              
              <div className="flex flex-wrap gap-2 pt-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-6 w-14" />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-center justify-between text-sm border-b pb-4">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-6" />
              </div>
              <div className="flex items-center space-x-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-6" />
              </div>
            </div>
          </div>

          
          <div className="border rounded-lg p-4 bg-muted/30">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="flex items-center justify-between">
              <div className="flex space-x-4">
                <Skeleton className="h-10 w-24" />
                <Skeleton className="h-10 w-28" />
              </div>
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
