// Lance kawna en local et affiche l'adresse à ouvrir sur l'iPhone (même Wi-Fi que le Mac).
import { spawn } from "node:child_process";
import { networkInterfaces } from "node:os";

const ips = Object.values(networkInterfaces()).flat().filter((i) => i && i.family === "IPv4" && !i.internal).map((i) => i.address);
console.log("\n  Sur ce Mac :      http://localhost:3000");
for (const ip of ips) console.log(`  Sur ton iPhone :  http://${ip}:3000`);
console.log("  Connecte YouTube et Trakt depuis le Mac (localhost), pas depuis l'iPhone.\n");
spawn("npx", ["next", "dev", "-H", "0.0.0.0", "-p", "3000"], { stdio: "inherit", shell: process.platform === "win32" });
