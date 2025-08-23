"use client";

import { useState, useMemo } from "react";
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

interface IncidentsClientProps {
  incidents: Incident[];
}

const ITEMS_PER_PAGE = 10;

export default function IncidentsClient({ incidents }: IncidentsClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter incidents based on search query
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

  // Pagination
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

  const handleIncidentAction = (action: string, incident: Incident) => {
    console.log(`${action} incident:`, incident.id);
    // TODO: Implement actual functionality
  };

  return (
    <div className="mx-auto container space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight ml-1">Incidents</h1>

        <div className="flex items-center gap-3">
          {/* Search Bar */}
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

          {/* Report New Incident Button */}
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="h-4 w-4 mr-2" />
            Report a new incident
          </Button>
        </div>
      </div>

      {/* Incidents Table */}
      <Card>
        <CardContent className="p-0">
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
                            <div className="font-medium">{incident.title}</div>
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
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
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

      {/* Footer */}
      <div className="text-center text-sm text-gray-500 py-6">
        <div className="flex items-center justify-center gap-2">
          <span>?</span>
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
