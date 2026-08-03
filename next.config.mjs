import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // This app is intentionally nested inside the Solidity workspace, which has
  // its own lockfile. Pin the tracing boundary to avoid Next scanning upward
  // and choosing the Hardhat project as the web application's root.
  outputFileTracingRoot: fileURLToPath(new URL("./", import.meta.url)),
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "assets.coingecko.com" },
      { protocol: "https", hostname: "coin-images.coingecko.com" },
    ],
  },
  webpack: (config, { webpack }) => {
    config.resolve.fallback = { ...config.resolve.fallback, encoding: false };
    // Coinbase's cdp-sdk (pulled in transitively via wagmi's baseAccount connector) references
    // several x402-payments-only submodules we never call, published in a way webpack can't
    // statically resolve. Ignore the whole namespace — dead code for this app either way.
    config.plugins.push(new webpack.IgnorePlugin({ resourceRegExp: /^@x402\// }));
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Blocks this wallet-connect app from being embedded in a hidden iframe (clickjacking).
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none';" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
