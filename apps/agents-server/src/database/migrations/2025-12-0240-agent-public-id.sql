
ALTER TABLE "prefix_Agent" ADD COLUMN "permanentId" TEXT;
CREATE UNIQUE INDEX "prefix_Agent_permanentId_key" ON "prefix_Agent"("permanentId");
