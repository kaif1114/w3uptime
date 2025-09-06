import { ProposalDetailClient } from "./ProposalDetailClient";
import { ProposalResponse } from "@/types/proposal";

interface ProposalDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function fetchProposal(id: string): Promise<ProposalResponse | null> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:8000";

  try {
    const response = await fetch(`${baseUrl}/api/proposals/${id}`, {
      cache: "no-store", // Ensure fresh data
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error("Failed to fetch proposal");
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching proposal:", error);
    return null;
  }
}

export default async function ProposalDetailPage({
  params,
}: ProposalDetailPageProps) {
  const { id } = await params;
  const initialData = await fetchProposal(id);

  if (!initialData) {
    return (
      <div className="space-y-4">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold mb-2">Proposal Not Found</h1>
          <p className="text-muted-foreground">
            The proposal you're looking for doesn't exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  return <ProposalDetailClient proposalId={id} initialData={initialData} />;
}
