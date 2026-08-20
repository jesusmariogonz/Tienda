import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { appName } from "@/lib/config";
import { SiteHeader } from "@/components/site-header";
import { WhatsappButton } from "@/components/whatsapp-button";
import { listCategoriesWithProducts } from "@/server/services/catalog";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: appName,
  description: "Tienda en línea",
  icons: {
    icon: "/brand/logo-dupefit.jpg",
    apple: "/brand/logo-dupefit.jpg",
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const categories = await listCategoriesWithProducts();

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-black">
        <SiteHeader categories={categories} />
        {children}
        <WhatsappButton />
      </body>
    </html>
  );
}
