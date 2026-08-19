import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { listAbandonedCarts } from "@/server/services/dashboard";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pendiente",
  CANCELLED: "Descartado",
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");
  const to = toParam ? new Date(`${toParam}T23:59:59`) : new Date();
  const from = fromParam
    ? new Date(`${fromParam}T00:00:00`)
    : new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);

  const carts = await listAbandonedCarts(from, to);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tienda";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Carritos abandonados");
  sheet.columns = [
    { header: "Fecha", key: "date", width: 20 },
    { header: "Orden", key: "orderNumber", width: 22 },
    { header: "Nombre", key: "name", width: 20 },
    { header: "Correo", key: "email", width: 28 },
    { header: "Teléfono", key: "phone", width: 16 },
    { header: "Productos", key: "items", width: 60 },
    { header: "Total", key: "total", width: 14 },
    { header: "Estado", key: "status", width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  sheet.addRows(
    carts.map((order) => ({
      date: order.createdAt.toLocaleString("es-MX"),
      orderNumber: order.orderNumber,
      name: order.customerName ?? "",
      email: order.customerEmail,
      phone: order.customerPhone ?? "",
      items: order.items
        .map(
          (item) =>
            `${item.quantity}x ${item.variant.product.name} (${item.variant.color}/${item.variant.size})`,
        )
        .join("; "),
      total: Number(order.total),
      status: STATUS_LABELS[order.status] ?? order.status,
    })),
  );

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="carritos-abandonados.xlsx"`,
    },
  });
}
