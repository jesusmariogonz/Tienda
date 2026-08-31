CREATE TABLE "AboutPageContent" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "styleImageUrl" TEXT,
    "shippingImageUrl" TEXT,
    "supportImageUrl" TEXT,
    "inventoryImageUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AboutPageContent_pkey" PRIMARY KEY ("id")
);
