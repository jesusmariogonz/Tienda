import { notFound } from "next/navigation";
import { getProductForAdmin } from "@/server/services/admin-catalog";
import { AdminProductForm } from "@/components/admin-product-form";
import { updateProductAction, deleteProductAction } from "../actions";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductForAdmin(id);
  if (!product) notFound();

  const boundUpdate = updateProductAction.bind(null, id);
  const boundDelete = deleteProductAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Editar producto</h1>
        <form action={boundDelete}>
          <button
            type="submit"
            className="text-sm text-red-600 underline"
          >
            Eliminar producto
          </button>
        </form>
      </div>

      <AdminProductForm
        action={boundUpdate}
        submitLabel="Guardar cambios"
        initialValues={{
          name: product.name,
          description: product.description ?? "",
          basePrice: Number(product.basePrice),
          categoryName: product.category?.name ?? "",
          active: product.active,
          imageUrls: product.images.map((i) => i.url),
          variants: product.variants
            .filter((v) => v.active)
            .map((v) => ({
              id: v.id,
              size: v.size,
              color: v.color,
              colorHex: v.colorHex ?? "#000000",
              quantity: v.inventory?.quantity ?? 0,
              lowStockThreshold: v.inventory?.lowStockThreshold ?? 5,
            })),
          wholesaleEnabled: product.wholesaleEnabled,
          wholesaleMinQty: product.wholesaleMinQty,
          wholesaleDiscountPercent: product.wholesaleDiscountPercent
            ? Number(product.wholesaleDiscountPercent)
            : null,
        }}
      />
    </div>
  );
}
