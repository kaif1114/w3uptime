"use client";

import { useState } from "react";
import { Incident } from "@/types/incident";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  MessageSquare,
  Camera,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface IncidentActionsProps {
  incident: Incident;
}

export default function IncidentActions({ incident }: IncidentActionsProps) {
  const [isAcknowledged, setIsAcknowledged] = useState(
    incident.status === "ACKNOWLEDGED" || incident.status === "RESOLVED"
  );

  const handleEscalate = () => {
    
    toast.info("Escalation functionality will be implemented later");
  };

  const handleAcknowledge = () => {
    
    setIsAcknowledged(true);
    toast.info("Acknowledgement functionality will be implemented later");
  };

  const handleResolve = () => {
    
    toast.info("Resolve functionality will be implemented later");
  };

  const handleResponse = () => {
    toast.info("Response functionality will be implemented later");
  };

  const handleScreenshot = () => {
    toast.info("Screenshot functionality will be implemented later");
  };

  const handleRemove = () => {
    toast.info("Remove functionality will be implemented later");
  };

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleEscalate}
          variant="default"
          className="bg-purple-600 hover:bg-purple-700"
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Escalate
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" className="bg-purple-600 hover:bg-purple-700">
              <CheckCircle className="h-4 w-4 mr-2" />
              Acknowledge
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={handleAcknowledge}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Acknowledge
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleResolve}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolve
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleResponse}
          className="h-8 w-8 p-0"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleScreenshot}
          className="h-8 w-8 p-0"
        >
          <Camera className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          className="h-8 w-8 p-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {!isAcknowledged && (
        <div className="absolute top-20 left-6">
          <Badge variant="secondary" className="text-xs">
            Not acknowledged yet
          </Badge>
        </div>
      )}
    </div>
  );
}
