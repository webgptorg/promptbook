ALTER TABLE "prefix_Agent" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'PRIVATE' CHECK ("visibility" IN ('PUBLIC', 'PRIVATE'));
