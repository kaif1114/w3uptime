"use client";

import { Monitor } from "@/types/monitor";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  ExternalLink,
  Globe 
} from "lucide-react";
import Link from "next/link";

import { useState } from "react";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useDeleteMonitor, usePauseMonitor } from "@/hooks/useMonitors";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface MonitorCardProps {
  monitor: Monitor;
}

  export function MonitorCard({ monitor }: MonitorCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const pauseMutation = usePauseMonitor();
  const deleteMutation = useDeleteMonitor();
  const router = useRouter();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500";
      case "PAUSED":
        return "bg-yellow-500";
      case "DOWN":
        return "bg-red-500";
      case "RECOVERING":
        return "bg-blue-500";
      case "DISABLED":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "outline" => {
    switch (status) {
      case "ACTIVE":
        return "default";
      case "PAUSED":
        return "secondary";
      case "DISABLED":
        return "outline";
      default:
        return "outline";
    }
  };

  const handlePauseToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = monitor.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    pauseMutation.mutate(
      { id: monitor.id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(`Monitor ${newStatus === "PAUSED" ? "paused" : "resumed"} successfully`);
        },
        onError: (error) => {
          toast.error(`Failed to ${newStatus === "PAUSED" ? "pause" : "resume"} monitor: ${error.message}`);
        }
      }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(monitor.id, {
      onSuccess: () => {
        toast.success("Monitor deleted successfully");
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        toast.error(`Failed to delete monitor: ${error.message}`);
      }
    });
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };


  return (
    <>
      <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(`/monitors/${monitor.id}`)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(monitor.status)}`} />
              <div className="space-y-1">
                <div className="font-semibold hover:underline">
                  {monitor.name}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <a 
                    href={monitor.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {monitor.url}
                  </a>
                  <ExternalLink className="h-3 w-3" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={getStatusVariant(monitor.status)}>
                {monitor.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="h-8 w-8 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handlePauseToggle}>
                    {monitor.status != "PAUSED" ? (
                      <>
                      <Play className="mr-2 h-4 w-4" />
                      Resume
                    </>
                    ) : (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                      
                    )}
                  </DropdownMenuItem>
                  <Link href={`/monitors/${monitor.id}/edit`}>
                    <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem 
                    onClick={handleDeleteClick}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
       <div className="flex items-center gap-2">
        <div className="text-sm font-medium text-muted-foreground">Set Escalation Policies to get Alerts</div>
        </div>
            <span>Created {new Date(monitor.createdAt).toLocaleDateString()}</span>
          </div>
        </CardContent>
      </Card>
  
      <DeleteConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleDelete}
        monitorName={monitor.name}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
} 