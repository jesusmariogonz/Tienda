-- Fixes SKUs generated before ASCII-safety was enforced (e.g. talla
-- "Única" produced a SKU containing "Ú") — those broke CODE128 barcode
-- rendering on the product edit page since CODE128 can't encode
-- non-ASCII characters.
UPDATE "ProductVariant"
SET sku = upper(
  regexp_replace(
    regexp_replace(
      translate(sku, 'ÁÉÍÓÚÑÜáéíóúñü', 'AEIOUNUaeiounu'),
      '[^A-Za-z0-9]+', '-', 'g'
    ),
    '(^-+|-+$)', '', 'g'
  )
)
WHERE sku ~ '[^\x00-\x7F]';
