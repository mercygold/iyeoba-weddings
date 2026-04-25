import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    domains: ["nuromwsjuprbdfzpiuza.supabase.co"],
  },
  async rewrites() {
    return [
      {
        source: "/tiktokNtAry8NLt2sLodUetFjztUm1XQhe4sIw.txt",
        destination: "/api/verify",
      },
    ];
  },
};

export default nextConfig;
