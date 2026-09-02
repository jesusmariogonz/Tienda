CREATE TABLE "WholesaleSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "minQty" INTEGER NOT NULL DEFAULT 8,
    "discountPercent" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WholesaleSettings_pkey" PRIMARY KEY ("id")
);
