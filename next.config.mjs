// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/scoring/new', destination: '/rounds/new', permanent: false },
      { source: '/scoring/:id/edit', destination: '/rounds/:id/edit', permanent: false },
      { source: '/scoring/:id', destination: '/rounds/:id', permanent: false },
      { source: '/old-rounds/new', destination: '/rounds/new', permanent: false },
      { source: '/old-rounds/:id/edit', destination: '/rounds/:id/edit', permanent: false },
      { source: '/old-rounds/:id', destination: '/rounds/:id', permanent: false },
    ]
  },
}
module.exports = nextConfig
