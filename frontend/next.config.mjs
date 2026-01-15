/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  devIndicators:
    process.env.NODE_ENV === 'production'
      ? false
      : { position: 'bottom-left' },
  };

export default nextConfig;
