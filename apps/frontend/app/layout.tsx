import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { ChatContextProvider } from "@/providers/ChatContextProvider";
import { dehydrate, QueryClient } from "@tanstack/react-query";
import { getSessionOnServer } from "@/lib/GetSessionOnServer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "W3Uptime",
  description: "W3Uptime is a platform for monitoring and managing the status of your services.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: ["session"],
    queryFn: getSessionOnServer,
  });
  const dehydratedState = dehydrate(queryClient);

  return (
    <html lang="en" suppressHydrationWarning className={poppins.className}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <QueryProvider dehydratedState={dehydratedState}>
          <ChatContextProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </ChatContextProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
