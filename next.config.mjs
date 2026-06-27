/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remotion's server-side renderer + bundler are heavy native/node packages
  // (they drive a headless browser). Keep them out of the bundle; they're
  // loaded dynamically by /api/render and only run on a render-capable host.
  serverExternalPackages: ["@remotion/renderer", "@remotion/bundler"],

};

export default nextConfig;
