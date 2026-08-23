type WholesaleProduct = {
  name: string;
  wholesaleMinQty: number | null;
  wholesaleDiscountPercent: unknown;
};

export function WholesaleMarquee({ products }: { products: WholesaleProduct[] }) {
  if (products.length === 0) return null;

  const messages = products.map(
    (p) => `${p.name}: -${Number(p.wholesaleDiscountPercent)}% comprando ${p.wholesaleMinQty}+ piezas`,
  );
  // Repeat so the marquee loop has no visible gap.
  const loop = [...messages, ...messages];

  return (
    <div className="overflow-hidden border-b border-black bg-white py-2">
      <div className="animate-marquee flex w-max gap-12 whitespace-nowrap text-xs font-medium tracking-wide text-black uppercase">
        {loop.map((msg, i) => (
          <span key={i}>✦ {msg}</span>
        ))}
      </div>
    </div>
  );
}
