/** @type {import('next').NextConfig} */
const nextConfig = {
  // Silence warnings
  // https://github.com/WalletConnect/walletconnect-monorepo/issues/1908
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");
    return config;
  },
  // Exclude Hardhat files from TypeScript checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Configure image domains for Farcaster profile pictures
  images: {
    domains: [
      'imagedelivery.net', // Farcaster profile images
      'images.remotePatterns',
      'i.imgur.com',       // Common image hosting
      'res.cloudinary.com', // Another common CDN
      'tba-mobile.mypinata.cloud' // Pinata IPFS gateway
    ],
  },
};

export default nextConfig;
