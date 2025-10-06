/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  async redirects() {
    return [
      // old -> new rounds flow (edit as needed)
      { source: '/scoring/new', destination: '/rounds/new', permanent: false },
      { source: '/scoring/:id/edit', destination: '/rounds/:id/edit', permanent: false },
      { source: '/scoring/:id', destination: '/rounds/:id', permanent: false },

      { source: '/old-rounds/new', destination: '/rounds/new', permanent: false },
      { source: '/old-rounds/:id/edit', destination: '/rounds/:id/edit', permanent: false },
      { source: '/old-rounds/:id', destination: '/rounds/:id', permanent: false },
    ]
  },
}

export default nextConfig
