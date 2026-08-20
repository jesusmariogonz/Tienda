-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "wholesaleDiscountPercent" DECIMAL(5,2),
ADD COLUMN     "wholesaleEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wholesaleMinQty" INTEGER;
