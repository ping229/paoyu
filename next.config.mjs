/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async headers() {
    return [
      {
        // 应用到所有路由
        source: '/:path*',
        headers: [
          // 防止XSS攻击
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // 防止点击劫持
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // 防止MIME类型嗅探
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // 引用策略
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // 权限策略
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
      // 静态资源缓存
      {
        source: '/uploads/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

export default nextConfig
