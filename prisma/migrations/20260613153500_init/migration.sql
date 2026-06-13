-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Model" (
    "id" SERIAL NOT NULL,
    "ckArticleId" TEXT NOT NULL,
    "year" INTEGER,
    "driver" TEXT,
    "team" TEXT,
    "car" TEXT,
    "series" TEXT,
    "race" TEXT,
    "brand" TEXT,
    "scale" TEXT,
    "link" TEXT,
    "currency" TEXT DEFAULT 'EUR',
    "carNumber" INTEGER,
    "isWishlisted" BOOLEAN NOT NULL DEFAULT false,
    "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
    "isChampion" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" SERIAL NOT NULL,
    "modelId" INTEGER NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScraperRun" (
    "id" SERIAL NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "newModels" INTEGER NOT NULL DEFAULT 0,
    "priceUps" INTEGER NOT NULL DEFAULT 0,
    "priceDowns" INTEGER NOT NULL DEFAULT 0,
    "totalScraped" INTEGER NOT NULL DEFAULT 0,
    "log" TEXT,

    CONSTRAINT "ScraperRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Model_ckArticleId_key" ON "Model"("ckArticleId");

-- CreateIndex
CREATE INDEX "Model_year_idx" ON "Model"("year");

-- CreateIndex
CREATE INDEX "Model_driver_idx" ON "Model"("driver");

-- CreateIndex
CREATE INDEX "Model_team_idx" ON "Model"("team");

-- CreateIndex
CREATE INDEX "Model_isWishlisted_idx" ON "Model"("isWishlisted");

-- CreateIndex
CREATE INDEX "Model_isBlacklisted_idx" ON "Model"("isBlacklisted");

-- CreateIndex
CREATE INDEX "PriceHistory_modelId_idx" ON "PriceHistory"("modelId");

-- CreateIndex
CREATE INDEX "PriceHistory_scrapedAt_idx" ON "PriceHistory"("scrapedAt");

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "Model"("id") ON DELETE CASCADE ON UPDATE CASCADE;
