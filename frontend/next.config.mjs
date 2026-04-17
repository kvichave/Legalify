/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "http://192.168.0.184:3000",
    "http://localhost:3000",
    "192.168.0.184",
    "192.168.0.157",
  ],

};

export default nextConfig;
