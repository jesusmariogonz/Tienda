import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "picsum.photos" },
      { protocol: "https", hostname: "placehold.co" },
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
    formats: ["image/avif", "image/webp"],
    // Next's on-the-fly image optimizer re-encodes every served image and
    // defaults to quality 75 unless a component passes `quality` — stacked
    // on top of the already-compressed webp from upload, that was visibly
    // softening product photos. 90 is registered here so product-facing
    // <Image> components can request it.
    qualities: [75, 90],
    minimumCacheTTL: 31536000, // 1 year — product photos rarely change in place
  },
};

export default nextConfig;
