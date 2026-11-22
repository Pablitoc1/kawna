// Importe tes abonnements YouTube depuis l'export Google Takeout (abonnements.csv / subscriptions.csv).
// Usage : npm run import:youtube -- chemin/vers/abonnements.csv [apprendre|divertir]
import { readFileSync, writeFileSync } from "node:fs";

const [file, universe = "divertir"] = process.argv.slice(2);
if (!file) {
  console.error("Usage : npm run import:youtube -- chemin/vers/abonnements.csv [apprendre|divertir]");
  process.exit(1);
}
const rows = readFileSync(file, "utf8").trim().split(/\r?\n/).slice(1);
const channels = rows
  .map((r) => r.split(","))
  .filter((c) => c[0]?.startsWith("UC"))
  .map(([id, , ...title]) => ({ nom: title.join(",").trim(), id: id.trim(), univers: universe }));

const path = new URL("../config/sources.json", import.meta.url);
const cfg = JSON.parse(readFileSync(path, "utf8"));
const known = new Set(cfg.youtube.map((c) => c.id));
const added = channels.filter((c) => !known.has(c.id));
cfg.youtube.push(...added);
writeFileSync(path, JSON.stringify(cfg, null, 2) + "\n");
console.log(`${added.length} chaînes ajoutées (univers « ${universe} »). Range-les ensuite entre apprendre et divertir dans config/sources.json.`);
