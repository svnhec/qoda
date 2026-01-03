import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disabled typedRoutes - causes issues with dynamic routes and redirects
  // experimental: {
  //   typedRoutes: true,
  // },
  eslint: {
    dirs: ["src"],
  },
  typescript: {
    tsconfigPath: "./tsconfig.json",
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.dicebear.com",
        port: "",
        pathname: "/9.x/**",
      },
    ],
  },
};

export default nextConfig;

