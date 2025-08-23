import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { getSessionOnServer } from "@/lib/get-session-on-server";
import IncidentDetailPage from "./IncidentDetailPage";

interface IncidentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function IncidentDetailPageServer({
  params,
}: IncidentDetailPageProps) {
  const session = await getSessionOnServer();
  const { id } = await params;

  console.log("Session object:", session);

  if (!session?.user) {
    console.log("No user found in session");
    notFound();
  }

  // Get the session ID from the cookie for the API request
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("sessionId")?.value;

  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8000";
    const url = `${baseUrl}/api/incidents/${id}`;
    console.log("Fetching incident with URL:", url);
    console.log("Session object keys:", Object.keys(session));
    console.log("Session ID from cookie:", sessionId);
    console.log("Cookie header:", `sessionId=${sessionId}`);
    
    const response = await fetch(url, {
      headers: {
        Cookie: `sessionId=${sessionId}`,
      },
      cache: "no-store",
    });

    console.log("Response status:", response.status, response.statusText);
    
    if (!response.ok) {
      if (response.status === 404) {
        notFound();
      }
      throw new Error(`Failed to fetch incident: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log("Response data:", data);
    const incident = data.incident;

    if (!incident) {
      console.error("Incident data is null or undefined");
      notFound();
    }

    return <IncidentDetailPage incident={incident} />;
  } catch (error) {
    console.error("Error fetching incident:", error);
    notFound();
  }
}
