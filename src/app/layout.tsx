import type { Metadata } from "next";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Iyeoba Weddings MVP",
  description:
    "Marketplace-first MVP for Nigerian wedding planning, vendor discovery, and AI wedding blueprints.",
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
