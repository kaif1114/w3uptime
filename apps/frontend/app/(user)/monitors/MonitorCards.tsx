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

interface MonitorCardProps {
  monitor: Monitor;
}

export function MonitorCard({ monitor }: MonitorCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const pauseMutation = usePauseMonitor();
  const deleteMutation = useDeleteMonitor();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-500";
      case "PAUSED":
        return "bg-yellow-500";
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

  const handlePauseToggle = () => {
    const newStatus = monitor.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    pauseMutation.mutate({ id: monitor.id, status: newStatus });
  };

  const handleDelete = () => {
    deleteMutation.mutate(monitor.id);
    setShowDeleteDialog(false);
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${getStatusColor(monitor.status)}`} />
              <div className="space-y-1">
                <Link 
                  href={`/monitors/${monitor.id}`}
                  className="font-semibold hover:underline"
                >
                  {monitor.name}
                </Link>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Globe className="h-4 w-4" />
                  <a 
                    href={monitor.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline"
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
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handlePauseToggle}>
                    {monitor.status === "ACTIVE" ? (
                      <>
                        <Pause className="mr-2 h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="mr-2 h-4 w-4" />
                        Resume
                      </>
                    )}
                  </DropdownMenuItem>
                  <Link href={`/monitors/${monitor.id}/modify`}>
                    <DropdownMenuItem>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                  </Link>
                  <DropdownMenuItem 
                    onClick={() => setShowDeleteDialog(true)}
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
            <div className="flex items-center gap-4">
              <span>Check every {formatInterval(monitor.checkInterval)}</span>
              <span>Timeout: {monitor.timeout}s</span>
              <span>Status codes: {monitor.expectedStatusCodes.join(", ")}</span>
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