/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  allowedDevOrigins: [
    "http://192.168.0.184:3000",
    "http://localhost:3000",
    "192.168.0.184",
    "192.168.0.157",
    "10.237.44.194",
  ],

};

export default nextConfig;
