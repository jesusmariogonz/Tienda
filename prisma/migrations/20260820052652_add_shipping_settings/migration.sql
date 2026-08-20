-- CreateTable
CREATE TABLE "ShippingSettings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "flatRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "freeOverAmount" DECIMAL(10,2),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingSettings_pkey" PRIMARY KEY ("id")
);
