import { generateDummyIncidents } from "@/lib/dummy-data";
import IncidentsClient from "./IncidentsClient";

export default function IncidentsPage() {
  // Generate dummy incidents data
  const incidents = generateDummyIncidents();

  return <IncidentsClient incidents={incidents} />;
}
