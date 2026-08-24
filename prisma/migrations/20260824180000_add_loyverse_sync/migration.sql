-- AlterEnum
ALTER TYPE "InventoryMovementType" ADD VALUE 'LOYVERSE_SYNC';

-- AlterTable
ALTER TABLE "ProductVariant" ADD COLUMN     "loyverseVariantId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariant_loyverseVariantId_key" ON "ProductVariant"("loyverseVariantId");
