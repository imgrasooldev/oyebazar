/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Fly.io par Docker image chhoti rakhne ke liye
  output: 'standalone',
  // workspace packages TS source se aate hain (koi build step nahi)
  transpilePackages: ['@oyebazar/core', '@oyebazar/db', '@oyebazar/queue', '@oyebazar/shared'],
  // Ye Node par chalte hain, bundle nahi hone chahiyen. BullMQ ke optional drivers
  // (@valkey/valkey-glide) warna "module not found" warnings deta rehta hai.
  serverExternalPackages: ['bullmq', 'ioredis', '@prisma/client'],
  // typed <Link href> — galat route compile hi na ho
  typedRoutes: true,
  images: {
    formats: ['image/webp'],
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  webpack: (config) => {
    // BullMQ Valkey (Redis ka fork) ko optionally support karta hai — hum Redis use
    // karte hain, isliye ye module kabhi load hi nahi hota. External mark na karen to
    // har build par "module not found" warning aati hai aur asli warnings us mein gum ho jati hain.
    config.externals = [...(config.externals ?? []), '@valkey/valkey-glide']
    return config
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
        ],
      },
    ]
  },
}

export default nextConfig
