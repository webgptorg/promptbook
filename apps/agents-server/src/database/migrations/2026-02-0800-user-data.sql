CREATE TABLE "prefix_UserData" (
    "id" SERIAL PRIMARY KEY,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    "userId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    FOREIGN KEY ("userId") REFERENCES "prefix_User"("id")
);

CREATE UNIQUE INDEX "prefix_UserData_userId_key_idx" ON "prefix_UserData"("userId", "key");
