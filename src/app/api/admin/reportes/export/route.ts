import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { auth } from "@/auth";
import {
  getSalesByPeriod,
  getTopProducts,
  getChannelSummary,
  type Granularity,
} from "@/server/services/reports";

const RANGE_OPTIONS: Record<
  string,
  { days: number; granularity: Granularity; label: string }
> = {
  "7d": { days: 7, granularity: "day", label: "7 días" },
  "30d": { days: 30, granularity: "day", label: "30 días" },
  "12w": { days: 84, granularity: "week", label: "12 semanas" },
  "12m": { days: 365, granularity: "month", label: "12 meses" },
};

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const toParam = req.nextUrl.searchParams.get("to");

  let from: Date;
  let to: Date;
  let granularity: Granularity;
  let label: string;
  let fileSuffix: string;

  if (fromParam && toParam) {
    from = new Date(`${fromParam}T00:00:00`);
    to = new Date(`${toParam}T23:59:59`);
    const spanDays = (to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000);
    granularity = spanDays <= 31 ? "day" : spanDays <= 180 ? "week" : "month";
    label = fromParam === toParam ? fromParam : `${fromParam} a ${toParam}`;
    fileSuffix = fromParam === toParam ? fromParam : `${fromParam}_${toParam}`;
  } else {
    const rangeKey = req.nextUrl.searchParams.get("range") ?? "30d";
    const option = RANGE_OPTIONS[rangeKey] ?? RANGE_OPTIONS["30d"];
    to = new Date();
    from = new Date(to.getTime() - option.days * 24 * 60 * 60 * 1000);
    granularity = option.granularity;
    label = option.label;
    fileSuffix = rangeKey;
  }

  const [byPeriod, topProducts, summary] = await Promise.all([
    getSalesByPeriod(from, to, granularity),
    getTopProducts(from, to, 50),
    getChannelSummary(from, to),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Tienda";
  workbook.created = new Date();

  const summarySheet = workbook.addWorksheet("Resumen");
  summarySheet.columns = [
    { header: "Métrica", key: "metric", width: 30 },
    { header: "Valor", key: "value", width: 20 },
  ];
  summarySheet.addRows([
    { metric: "Periodo", value: label },
    { metric: "Ingresos totales", value: summary.totalRevenue },
    { metric: "Ingresos online", value: summary.onlineRevenue },
    { metric: "Órdenes online", value: summary.onlineOrders },
    { metric: "Ingresos mostrador", value: summary.posRevenue },
    { metric: "Ventas mostrador", value: summary.posSales },
  ]);
  summarySheet.getRow(1).font = { bold: true };

  const periodSheet = workbook.addWorksheet("Ventas por periodo");
  periodSheet.columns = [
    { header: "Periodo", key: "period", width: 20 },
    { header: "Online", key: "online", width: 15 },
    { header: "Mostrador", key: "pos", width: 15 },
    { header: "Total", key: "total", width: 15 },
  ];
  periodSheet.addRows(
    byPeriod.map((p) => ({
      period: new Date(p.period).toLocaleDateString("es-MX"),
      online: p.online,
      pos: p.pos,
      total: p.total,
    })),
  );
  periodSheet.getRow(1).font = { bold: true };

  const productsSheet = workbook.addWorksheet("Productos más vendidos");
  productsSheet.columns = [
    { header: "Producto", key: "productName", width: 35 },
    { header: "Unidades vendidas", key: "quantity", width: 20 },
    { header: "Ingresos", key: "revenue", width: 15 },
  ];
  productsSheet.addRows(topProducts);
  productsSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-${fileSuffix}.xlsx"`,
    },
  });
}
