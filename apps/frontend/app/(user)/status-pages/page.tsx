"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Ellipsis, Plus, Search } from "lucide-react";

type StatusValue = "operational" | "degraded" | "down";

type StatusPage = {
  id: string;
  url: string;
  status: StatusValue;
};

const DUMMY_STATUS_PAGES: StatusPage[] = [
  { id: "1", url: "cores-connect.betteruptime.com", status: "operational" },
  { id: "2", url: "api.examplestatus.com", status: "degraded" },
  { id: "3", url: "shop.examplestatus.com", status: "down" },
];

function getStatusStyles(status: StatusValue) {
  switch (status) {
    case "operational":
      return {
        dot: "bg-emerald-500",
      };
    case "degraded":
      return {
        dot: "bg-amber-500",
      };
    case "down":
      return {
        dot: "bg-rose-500",
      };
  }
}

export default function StatusPagesListPage() {
  const [query, setQuery] = useState("");

  const filteredPages = useMemo(() => {
    if (!query.trim()) return DUMMY_STATUS_PAGES;
    const lower = query.toLowerCase();
    return DUMMY_STATUS_PAGES.filter((p) =>
      p.url.toLowerCase().includes(lower)
    );
  }, [query]);

  return (
    <div className="container mx-auto px-4 pt-4 pb-6">
      <div className="flex items-center justify-between mb-6 gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Status pages</h1>
        <div className="flex items-center gap-3 w-full max-w-xl">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Link href="/status-pages/create">
            <Button className="whitespace-nowrap">
              <Plus className="mr-2 h-4 w-4" />
              Create status page
            </Button>
          </Link>
        </div>
      </div>

      <Card className="py-0 gap-0">
        <CardHeader className="border-b py-3 pb-3">
          <CardTitle>Status pages</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {filteredPages.map((page) => {
              const styles = getStatusStyles(page.status);
              return (
                <li key={page.id} className="px-6 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${styles.dot}`}
                      />
                      <div className="min-w-0">
                        <div className="font-medium truncate">{page.url}</div>
                        <div className="text-muted-foreground text-xs">
                          1 resource
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label="Open menu"
                        >
                          <Ellipsis className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem>Configure</DropdownMenuItem>
                        <DropdownMenuItem>Select</DropdownMenuItem>
                        <DropdownMenuItem>Create group</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </li>
              );
            })}
            {filteredPages.length === 0 && (
              <li className="px-6 py-8 text-center text-muted-foreground">
                No status pages found.
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
