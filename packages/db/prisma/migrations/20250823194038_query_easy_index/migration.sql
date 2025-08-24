-- CreateIndex
CREATE INDEX "Incident_monitorId_idx" ON "public"."Incident"("monitorId");

-- CreateIndex
CREATE INDEX "Incident_monitorId_status_idx" ON "public"."Incident"("monitorId", "status");
