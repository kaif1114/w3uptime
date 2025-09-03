import { ProposalDetailClient } from "./ProposalDetailClient";

interface ProposalDetailPageProps {
  params: {
    id: string;
  };
}

export default function ProposalDetailPage({
  params,
}: ProposalDetailPageProps) {
  return <ProposalDetailClient proposalId={params.id} />;
}
