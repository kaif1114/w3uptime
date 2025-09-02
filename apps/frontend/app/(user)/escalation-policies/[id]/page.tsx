import { EscalationPolicyDetailPage } from "./EscalationPolicyDetailPage";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="container mx-auto max-w-6xl">
      <EscalationPolicyDetailPage policyId={id} />
    </div>
  );
}
