/**
 * Next.js Configuration for Azora Buildspaces
 *
 * Constitutional Compliance:
 * - Article VII: Security & Protection - Implements security headers
 * - Article VIII: Truth Verification - Ensures secure data transmission
 * - No Mock Protocol: Production-ready configuration
 */

// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL']
  for (const v of requiredEnvVars) {
    if (!process.env[v]) {
      throw new Error(`Missing required environment variable: ${v}`)
    }
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Security Headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com https://vercel.live https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' ws://localhost:* wss://localhost:* https://vercel.live wss://vercel.live https://*.pusher.com wss://*.pusher.com https://emkc.org https://*.azora.world wss://*.azora.world wss://signaling.yjs.dev wss://y-webrtc-signaling-eu.herokuapp.com wss://y-webrtc-signaling-us.herokuapp.com",
              "worker-src 'self' blob:",
              "child-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },

  // Compiler options
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Experimental features
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },

  // Environment variables
  env: {
    BUILDSPACES_VERSION: "1.0.0",
    CONSTITUTIONAL_AI_ENABLED: "true",
  },
};

export default nextConfig;
