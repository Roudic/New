/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pdf-parse", "xlsx", "3d-force-graph", "three"],
  },
  transpilePackages: ["3d-force-graph", "three", "three-forcegraph", "three-render-objects"],
  // Allow phones on the same Wi-Fi to load dev assets (Next.js 14.2+)
  allowedDevOrigins: [
    "192.168.*",
    "10.*",
    "172.16.*",
    "172.17.*",
    "172.18.*",
    "172.19.*",
    "172.2*",
    "172.30.*",
    "172.31.*",
  ],
  async rewrites() {
    return [
      { source: "/brain/api/:path*", destination: "/api/brain/:path*" },
      { source: "/pulse", destination: "/pulse/index.html" },
      { source: "/pulse/", destination: "/pulse/index.html" },
    ];
  },
};

export default nextConfig;
