import { AdminProductForm } from "@/components/admin-product-form";
import { createProductAction } from "../actions";

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Nuevo producto</h1>
      <AdminProductForm action={createProductAction} submitLabel="Crear producto" />
    </div>
  );
}
