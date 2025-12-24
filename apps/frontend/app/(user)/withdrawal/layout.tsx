import { getSessionOnServer } from "@/lib/GetSessionOnServer";
import { redirect } from "next/navigation";
import FloatingTopbar from "./components/FloatingTopbar";

export default async function ValidatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionOnServer();
  if (!session?.authenticated) {
    redirect("/");
  }
  return (
    <div className="relative">
      {/* <FloatingTopbar /> */}
      <div>{children}</div>
    </div>
  );
}
