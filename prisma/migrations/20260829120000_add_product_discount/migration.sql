ALTER TABLE "Product" ADD COLUMN "discountEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "discountPercent" DECIMAL(5,2);
