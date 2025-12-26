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
import { Copy, Ellipsis, Plus, Search } from "lucide-react";
import { useStatusPages } from "@/hooks/useStatusPages";
import { toast } from "sonner";

type StatusValue = "operational" | "degraded" | "down";

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

export default function StatusPagesList() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useStatusPages();

  const copyStatusPageLink = async (id: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_URL || window.location.origin;
    const link = `${baseUrl}/status/${id}`;

    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const filteredPages = useMemo(() => {
    const list = (data?.statusPages || []).map((p) => ({
      id: p.id,
      url: p.name,
      status: "operational" as StatusValue,
    }));
    if (!query.trim()) return list;
    const lower = query.toLowerCase();
    return list.filter((p) => p.url.toLowerCase().includes(lower));
  }, [query, data]);

  return (
    <div className=" pt-4 pb-6">
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
            {isLoading && (
              <li className="px-6 py-8 text-muted-foreground">Loading...</li>
            )}
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
                        <div className="font-medium truncate">
                          <Link href={`/status-pages/${page.id}`}>
                            {page.url}
                          </Link>
                        </div>
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
                        <DropdownMenuItem
                          onClick={() => copyStatusPageLink(page.id)}
                        >
                          Copy Link
                          <Copy className="ml-2 h-4 w-4" />
                        </DropdownMenuItem>
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
