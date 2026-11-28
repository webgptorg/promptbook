-- Add agentId column to associate files with agents
ALTER TABLE "prefix_File" ADD COLUMN IF NOT EXISTS "agentId" INTEGER NULL;

-- Add foreign key constraint to Agent table
ALTER TABLE "prefix_File" ADD CONSTRAINT "File_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "prefix_Agent" ("id") ON DELETE SET NULL;
