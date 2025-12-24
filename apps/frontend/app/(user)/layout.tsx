import { AppSidebar } from "@/components/ui/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { SiteHeader } from "@/components/ui/SiteHeader";
import { getSessionOnServer } from "@/lib/GetSessionOnServer";
import { redirect } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";
import { AccountChangeManager } from "@/components/wallet/account-change-manager";
import { ChatWidget } from "@/components/assistant/ChatWidget";

export default async function UserLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionOnServer();
  if (!session?.authenticated) {
    redirect("/");
  }
  return (
    <>
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <AccountChangeManager />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-3 py-3 md:gap-4 md:py-4">
              <div className="max-w-6xl mx-auto p-6 container">
              {children}
              </div>
              <Toaster richColors closeButton />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
    <ChatWidget />
    </>
  );
}
