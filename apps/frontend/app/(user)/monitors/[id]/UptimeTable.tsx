"use client";

import { MonitorStats } from "@/types/monitor";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface UptimeTableProps {
  stats: MonitorStats;
}

export function UptimeTable({ stats }: UptimeTableProps) {
  const [dateRange, setDateRange] = useState({
    from: "7/29/2025",
    to: "8/13/2025"
  });

  const tableData = [
    {
      period: "Today",
      availability: `${stats.uptime.today}%`,
      downtime: stats.downtime.today,
      incidents: stats.incidents.today,
      longestIncident: stats.incidents.today > 0 ? stats.longestIncident : "none",
      avgIncident: stats.incidents.today > 0 ? stats.avgIncident : "none"
    },
    {
      period: "Last 7 days",
      availability: `${stats.uptime.last7Days}%`,
      downtime: stats.downtime.last7Days,
      incidents: stats.incidents.last7Days,
      longestIncident: stats.incidents.last7Days > 0 ? stats.longestIncident : "none",
      avgIncident: stats.incidents.last7Days > 0 ? stats.avgIncident : "none"
    },
    {
      period: "Last 30 days",
      availability: `${stats.uptime.last30Days}%`,
      downtime: stats.downtime.last30Days,
      incidents: stats.incidents.last30Days,
      longestIncident: stats.incidents.last30Days > 0 ? stats.longestIncident : "none",
      avgIncident: stats.incidents.last30Days > 0 ? stats.avgIncident : "none"
    },
    {
      period: "Last 365 days",
      availability: `${stats.uptime.last365Days}%`,
      downtime: stats.downtime.last365Days,
      incidents: stats.incidents.last365Days,
      longestIncident: stats.incidents.last365Days > 0 ? stats.longestIncident : "none",
      avgIncident: stats.incidents.last365Days > 0 ? stats.avgIncident : "none"
    },
    {
      period: "All time (Last 28 days)",
      availability: `${stats.uptime.allTime}%`,
      downtime: stats.downtime.allTime,
      incidents: stats.incidents.allTime,
      longestIncident: stats.incidents.allTime > 0 ? stats.longestIncident : "none",
      avgIncident: stats.incidents.allTime > 0 ? stats.avgIncident : "none"
    }
  ];

  const getAvailabilityColor = (availability: string) => {
    const percent = parseFloat(availability);
    if (percent >= 99.9) return "text-green-600";
    if (percent >= 99.0) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">From</span>
          <Input
            type="text"
            value={dateRange.from}
            onChange={(e) => setDateRange(prev => ({ ...prev, from: e.target.value }))}
            className="w-28"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">To</span>
          <Input
            type="text"
            value={dateRange.to}
            onChange={(e) => setDateRange(prev => ({ ...prev, to: e.target.value }))}
            className="w-28"
          />
        </div>
        <Button variant="outline" size="sm">
          Calculate
        </Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Time period</TableHead>
            <TableHead>Availability</TableHead>
            <TableHead>Downtime</TableHead>
            <TableHead>Incidents</TableHead>
            <TableHead>Longest incident</TableHead>
            <TableHead>Avg. Incident</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tableData.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{row.period}</TableCell>
              <TableCell className={getAvailabilityColor(row.availability)}>
                {row.availability}
              </TableCell>
              <TableCell>{row.downtime}</TableCell>
              <TableCell>{row.incidents}</TableCell>
              <TableCell>{row.longestIncident}</TableCell>
              <TableCell>{row.avgIncident}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 