import { getSessionOnServer } from "@/lib/get-session-on-server";
import { redirect } from "next/navigation";

export default async function ValidatorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSessionOnServer();
  if (!session?.authenticated) {
    redirect("/login");
  }
  return <div>{children}</div>;
}
