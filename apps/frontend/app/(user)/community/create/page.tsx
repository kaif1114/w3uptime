import { CreateProposalForm } from "./CreateProposalForm";

export default function CreateProposalPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Submit a Proposal</h1>
        <p className="text-muted-foreground">
          Share your ideas and help shape the future of W3Uptime. Choose the
          type that best fits your proposal.
        </p>
      </div>
      <CreateProposalForm />
    </div>
  );
}
