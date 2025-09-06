import { getSessionOnServer } from "@/lib/get-session-on-server";
import { redirect } from "next/navigation";
import FloatingTopbar from "./components/FloatingTopbar";

export default async function ValidatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionOnServer();
  if (!session?.authenticated) {
    redirect("/login");
  }
  return (
    <div className="relative">
      <FloatingTopbar />
      <div className="pt-20">{children}</div>
    </div>
  );
}
