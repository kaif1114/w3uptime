"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useChatContext } from "@/providers/ChatContextProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  MessageCircle,
  MoreHorizontal,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Eye,
  CheckCircle,
  Edit,
  Trash2,
} from "lucide-react";
import { Incident, IncidentStatus } from "@/types/incident";
import { formatDistanceToNow, format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIncidents, useUpdateIncident, useDeleteIncident } from "@/hooks/useIncidents";

const ITEMS_PER_PAGE = 10;

export default function IncidentsClient() {
  const { setContext } = useChatContext();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const { data: incidents = [], isLoading: loading, error: queryError } = useIncidents();
  const updateIncidentMutation = useUpdateIncident();
  const deleteIncidentMutation = useDeleteIncident();

  const error = queryError?.message || null;

  useEffect(() => {
    setContext({ pageType: 'incidents' });

    return () => {
      setContext(null);
    };
  }, [setContext]);

  
  const filteredIncidents = useMemo(() => {
    return incidents.filter(
      (incident) =>
        incident.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        incident.description
          ?.toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        incident.Monitor.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [incidents, searchQuery]);

  
  const totalPages = Math.ceil(filteredIncidents.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedIncidents = filteredIncidents.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE
  );

  const getStatusIcon = (status: IncidentStatus) => {
    switch (status) {
      case "ACKNOWLEDGED":
        return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
      case "ONGOING":
        return <Shield className="h-4 w-4 text-red-500" />;
      case "RESOLVED":
        return <ShieldCheck className="h-4 w-4 text-green-500" />;
      default:
        return <Shield className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: IncidentStatus) => {
    switch (status) {
      case "ACKNOWLEDGED":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "ONGOING":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "RESOLVED":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatStartedAt = (date: Date) => {
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return formatDistanceToNow(date, { addSuffix: true });
    } else {
      return format(date, "MMM d 'at' h:mm a");
    }
  };

  const handleIncidentAction = async (action: string, incident: Incident) => {
    try {
      switch (action) {
        case "resolve":
          await updateIncidentMutation.mutateAsync({ id: incident.id, data: { status: "RESOLVED" } });
          break;
        case "remove":
          if (confirm("Are you sure you want to delete this incident?")) {
            await deleteIncidentMutation.mutateAsync(incident.id);
          }
          break;
        case "view":
          router.push(`/incidents/${incident.id}`);
          break;
        case "edit":
          
          console.log("Edit incident:", incident.id);
          break;
        default:
          console.log(`${action} incident:`, incident.id);
      }
    } catch (error) {
      console.error(`Failed to ${action} incident:`, error);
      
    }
  };

  if (loading) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading incidents...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-red-500 mb-4">
              Error loading incidents: {error}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Incidents</h1>

        <div className="flex items-center gap-3">
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-8 w-full sm:w-64"
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
              /
            </span>
          </div>
        </div>
      </div>

      
      <Card>
        <CardContent className="p-3">
          {paginatedIncidents.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <p className="text-gray-500 mb-4">
                  {searchQuery
                    ? "No incidents found matching your search."
                    : "No incidents found."}
                </p>
                {searchQuery && (
                  <Button
                    variant="outline"
                    onClick={() => setSearchQuery("")}
                    className="text-purple-600 hover:text-purple-700"
                  >
                    Clear search
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium text-gray-500">
                      Incident
                    </th>
                    <th className="text-left p-4 font-medium text-gray-500">
                      Started at
                    </th>
                    <th className="text-left p-4 font-medium text-gray-500">
                      Length
                    </th>
                    <th className="text-right p-4 font-medium text-gray-500"></th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedIncidents.map((incident) => (
                    <tr
                      key={incident.id}
                      className="border-b hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <td className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(incident.status)}
                            <div>
                              <div 
                                className="font-medium cursor-pointer hover:text-purple-600 transition-colors"
                                onClick={() => router.push(`/incidents/${incident.id}`)}
                              >
                                {incident.title}
                              </div>
                              <div className="text-sm text-gray-500">
                                {incident.description}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {incident.comments.length > 0 ? (
                            <>
                              <MessageCircle className="h-4 w-4" />
                              <span className="bg-gray-100 dark:bg-gray-800 text-xs px-1 rounded">
                                {incident.comments.length}
                              </span>
                            </>
                          ) : (
                            <Calendar className="h-4 w-4" />
                          )}
                          {formatStartedAt(incident.createdAt)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              incident.status === "ACKNOWLEDGED"
                                ? "bg-yellow-500"
                                : incident.status === "ONGOING"
                                  ? "bg-red-500"
                                  : "bg-green-500"
                            }`}
                          />
                          <Badge className={getStatusColor(incident.status)}>
                            {incident.status}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleIncidentAction("view", incident)
                              }
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleIncidentAction("resolve", incident)
                              }
                              className="flex items-center gap-2"
                            >
                              <CheckCircle className="h-4 w-4" />
                              Resolve
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleIncidentAction("edit", incident)
                              }
                              className="flex items-center gap-2"
                            >
                              <Edit className="h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleIncidentAction("remove", incident)
                              }
                              className="flex items-center gap-2 text-red-600"
                            >
                              <Trash2 className="h-4 w-4" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="w-8 h-8 p-0"
              >
                {page}
              </Button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      
      <div className="text-center text-sm text-gray-500 py-6">
        <div className="flex items-center justify-center gap-2">
       
          <span>Need help? Let us know at</span>
          <a
            href="mailto:hello@w3uptime.com"
            className="text-purple-600 hover:underline"
          >
            hello@w3uptime.com
          </a>
        </div>
      </div>
    </div>
  );
}
