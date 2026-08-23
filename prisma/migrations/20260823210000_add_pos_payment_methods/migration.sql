-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'TRANSFER');

-- CreateTable
CREATE TABLE "PosSalePayment" (
    "id" TEXT NOT NULL,
    "posSaleId" TEXT NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "PosSalePayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PosSalePayment_posSaleId_idx" ON "PosSalePayment"("posSaleId");

-- CreateIndex
CREATE INDEX "PosSalePayment_method_idx" ON "PosSalePayment"("method");

-- AddForeignKey
ALTER TABLE "PosSalePayment" ADD CONSTRAINT "PosSalePayment_posSaleId_fkey" FOREIGN KEY ("posSaleId") REFERENCES "PosSale"("id") ON DELETE CASCADE ON UPDATE CASCADE;
