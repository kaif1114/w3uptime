import { ProposalDetailClient } from "./ProposalDetailClient";

interface ProposalDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProposalDetailPage({
  params,
}: ProposalDetailPageProps) {
  const { id } = await params;

  return <ProposalDetailClient proposalId={id} />;
}
