import StatusPageEditor from "./status-page-editor";

export const dynamic = "force-dynamic";

export default async function CreateStatusPagePage() {
  // Server component. No client hooks here.
  return (
    <div className="container mx-auto px-4 py-6">
      <StatusPageEditor mode="create" />
    </div>
  );
}
