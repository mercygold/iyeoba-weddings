import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  images: {
    domains: ["nuromwsjuprbdfzpiuza.supabase.co"],
  },
};

export default nextConfig;
