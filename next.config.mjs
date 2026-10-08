/** @type {import('next').NextConfig} */
const rawBackendOrigin =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:8000";

const backendOrigin = rawBackendOrigin.replace("0.0.0.0", "localhost");

const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
