import { networkInterfaces } from "node:os";
import type { NextConfig } from "next";

/** Adresses du Mac sur le Wi-Fi : en local, l'iPhone peut ouvrir kawna (npm run iphone). */
const lan = Object.values(networkInterfaces())
  .flat()
  .flatMap((i) => (i && i.family === "IPv4" && !i.internal ? [i.address] : []));

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  allowedDevOrigins: [...lan, "*.local"],
};

export default nextConfig;
