-- AlterTable
ALTER TABLE "Model" ADD COLUMN     "isAvailable" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Model_isAvailable_idx" ON "Model"("isAvailable");
