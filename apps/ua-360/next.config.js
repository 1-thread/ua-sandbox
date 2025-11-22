/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['oaidalleapiprodscus.blob.core.windows.net', 'cdn.openai.com'],
    unoptimized: true,
  },
}

module.exports = nextConfig

