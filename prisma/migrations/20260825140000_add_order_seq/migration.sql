-- Sequential, human-facing order number (#DF-00123) shown to customers,
-- separate from the internal `orderNumber` (used by webhooks/logs).
CREATE SEQUENCE IF NOT EXISTS "Order_orderSeq_seq";

ALTER TABLE "Order" ADD COLUMN "orderSeq" INTEGER;

-- Backfill existing rows in createdAt order so older orders keep lower numbers.
WITH numbered AS (
  SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt") AS rn
  FROM "Order"
)
UPDATE "Order" o
SET "orderSeq" = numbered.rn
FROM numbered
WHERE o."id" = numbered.id;

ALTER SEQUENCE "Order_orderSeq_seq" OWNED BY "Order"."orderSeq";
SELECT setval('"Order_orderSeq_seq"', COALESCE((SELECT MAX("orderSeq") FROM "Order"), 0) + 1, false);

ALTER TABLE "Order" ALTER COLUMN "orderSeq" SET DEFAULT nextval('"Order_orderSeq_seq"');
ALTER TABLE "Order" ALTER COLUMN "orderSeq" SET NOT NULL;

CREATE UNIQUE INDEX "Order_orderSeq_key" ON "Order"("orderSeq");
