"use client";

import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import { WalletAddress } from "@/components/ui/WalletAddress";
import { useSession } from "@/hooks/useSession";

export function SiteHeader() {
  const { data: session } = useSession();

  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">W3Uptime</h1>
        {/* <div className="ml-auto flex items-center gap-2">
          {session?.user?.walletAddress && (
            <Badge variant="outline" className="font-normal">
              <WalletAddress
                address={session.user.walletAddress}
                showCopyButton={true}
              />
            </Badge>
          )}
        </div> */}
      </div>
    </header>
  );
}
