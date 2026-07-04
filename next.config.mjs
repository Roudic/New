/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
