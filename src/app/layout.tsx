import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";

const googleAnalyticsId = "G-THETT8PBSQ";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.iyeobaweddings.com/"),
  title: "Iyeoba Weddings | Trusted Vendor Marketplace & Planning Tool",
  description:
    "Discover trusted Nigerian wedding vendors, planning tools, cultural inspiration, and wedding trends across Nigeria and the diaspora.",
  openGraph: {
    title: "Iyeoba Weddings | Trusted Vendor Marketplace & Planning Tool",
    description:
      "Discover trusted Nigerian wedding vendors, planning tools, cultural inspiration, and wedding trends across Nigeria and the diaspora.",
    url: "https://www.iyeobaweddings.com/",
    siteName: "Iyeoba Weddings",
    images: [
      {
        url: "/wedding-romance-bg.jpg",
        width: 1200,
        height: 630,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Iyeoba Weddings | Trusted Vendor Marketplace & Planning Tool",
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
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${googleAnalyticsId}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){window.dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${googleAnalyticsId}');
          `}
        </Script>
      </head>
      <body className="min-h-full flex flex-col">
        <div className="flex-1">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
