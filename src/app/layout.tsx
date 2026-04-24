import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Iyeoba Weddings | Nigerian Wedding Marketplace & Planning Tool",
  description:
    "Discover trusted Nigerian wedding vendors, planning tools, cultural inspiration, and wedding trends across Nigeria and the diaspora.",
  openGraph: {
    title: "Iyeoba Weddings | Nigerian Wedding Marketplace & Planning Tool",
    description:
      "Discover trusted Nigerian wedding vendors, planning tools, cultural inspiration, and wedding trends across Nigeria and the diaspora.",
    siteName: "Iyeoba Weddings",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Iyeoba Weddings | Nigerian Wedding Marketplace & Planning Tool",
    description:
      "Discover trusted Nigerian wedding vendors, planning tools, cultural inspiration, and wedding trends across Nigeria and the diaspora.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
