/** @type {import('next').NextConfig} */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

let supabaseHostname;

try {
  supabaseHostname = supabaseUrl ? new URL(supabaseUrl).hostname : undefined;
} catch {
  supabaseHostname = undefined;
}

const nextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,

  images: {
    remotePatterns: supabaseHostname
      ? [
          {
            protocol: "https",
            hostname: supabaseHostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
