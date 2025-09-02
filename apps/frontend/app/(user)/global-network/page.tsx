import { MapboxGlobeMap } from "./MapboxGlobeMap";
import { ValidatorMap } from "./ValidatorMap";

export default function GlobalNetworkPage() {
  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Global Validator Network</h1>
        <p className="text-muted-foreground">
          View the global distribution of validators monitoring your services across the world.
        </p>
      </div>
      
      <div className="space-y-6">
        <MapboxGlobeMap monitorId="" />
        <ValidatorMap monitorId="" />
      </div>
    </div>
  );
}