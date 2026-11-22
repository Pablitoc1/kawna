/* Visuels partagés : illustrations générées quand une source n'a pas d'image, logos de sources, anneaux de budget. */

const PAL = [
  ["#f2c14e", "#f78154", "#4d9078"], ["#1b2a49", "#e2557a", "#f6d6ad"], ["#0f4c5c", "#5f0f40", "#fb8b24"],
  ["#283d3b", "#197278", "#edddd4"], ["#3a0ca3", "#4cc9f0", "#f72585"], ["#606c38", "#283618", "#dda15e"],
  ["#22223b", "#9a8c98", "#f2e9e4"], ["#023047", "#ffb703", "#8ecae6"], ["#540b0e", "#e09f3e", "#fff3b0"],
  ["#14213d", "#fca311", "#e5e5e5"], ["#2b2d42", "#ef233c", "#edf2f4"], ["#1d3557", "#a8dadc", "#e63946"],
];
const MOTIFS = ["sun", "rings", "stripes", "hills", "grid", "blob", "wave"] as const;

export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

function svg(seed: number, w: number, h: number) {
  const [a, b, c] = PAL[seed % PAL.length];
  const motif = MOTIFS[(seed >>> 4) % MOTIFS.length];
  const m = Math.min(w, h);
  let body = "";
  if (motif === "sun") body = `<circle cx="${w * 0.5}" cy="${h * 0.42}" r="${m * 0.26}" fill="${c}"/><rect y="${h * 0.58}" width="${w}" height="${h * 0.42}" fill="${b}"/>`;
  else if (motif === "rings") body = [0, 1, 2, 3].map((i) => `<circle cx="${w * 0.7}" cy="${h * 0.35}" r="${m * (0.12 + i * 0.13)}" fill="none" stroke="${c}" stroke-width="${Math.max(2, w / 40)}" opacity="${1 - i * 0.2}"/>`).join("");
  else if (motif === "stripes") body = [0, 1, 2, 3, 4, 5].map((i) => `<rect x="${-w * 0.2 + i * w * 0.22}" y="${-h * 0.3}" width="${w * 0.09}" height="${h * 1.6}" fill="${i % 2 ? c : b}" transform="rotate(25 ${w / 2} ${h / 2})"/>`).join("");
  else if (motif === "hills") body = `<path d="M0 ${h * 0.6} L${w * 0.3} ${h * 0.35} L${w * 0.55} ${h * 0.55} L${w * 0.8} ${h * 0.25} L${w} ${h * 0.45} V${h} H0z" fill="${b}"/><path d="M0 ${h * 0.78} L${w * 0.4} ${h * 0.6} L${w} ${h * 0.8} V${h} H0z" fill="${c}" opacity=".85"/>`;
  else if (motif === "grid") body = [...Array(12)].map((_, i) => `<rect x="${(i % 4) * (w / 4) + 3}" y="${Math.floor(i / 4) * (h / 3) + 3}" width="${w / 4 - 6}" height="${h / 3 - 6}" rx="4" fill="${[b, c, a][(i * 7 + seed) % 3]}" opacity="${0.55 + ((i * 3) % 5) / 10}"/>`).join("");
  else if (motif === "blob") body = `<circle cx="${w * 0.3}" cy="${h * 0.3}" r="${m * 0.38}" fill="${b}"/><circle cx="${w * 0.75}" cy="${h * 0.7}" r="${m * 0.3}" fill="${c}" opacity=".9"/>`;
  else body = [0, 1, 2, 3].map((i) => `<path d="M0 ${h * (0.35 + i * 0.15)} Q ${w * 0.25} ${h * (0.25 + i * 0.15)} ${w * 0.5} ${h * (0.35 + i * 0.15)} T ${w} ${h * (0.35 + i * 0.15)} V${h} H0z" fill="${i % 2 ? c : b}" opacity=".6"/>`).join("");
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect width="${w}" height="${h}" fill="${a}"/>${body}</svg>`;
}

/** Illustration abstraite et stable pour un titre donné. Le SVG est généré ici, jamais à partir de contenu externe. */
export function Art({ seed, w = 320, h = 180 }: { seed: string; w?: number; h?: number }) {
  return <span className="art" dangerouslySetInnerHTML={{ __html: svg(hash(seed), w, h) }} />;
}

/** Image de la source si elle existe, sinon une illustration. */
export function Cover({ src, seed, w, h, alt = "" }: { src?: string; seed: string; w?: number; h?: number; alt?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return src ? <img src={src} alt={alt} loading="lazy" /> : <Art seed={seed} w={w} h={h} />;
}

const BADGE_COLORS = ["#d63a3a", "#7b5bd6", "#e5486b", "#e8862e", "#8b4fd1", "#2f7d68", "#3c6e71", "#3b5ba9", "#b0702a"];

export function Badge({ name, color, size }: { name: string; color?: string; size?: number }) {
  const initials = name.length <= 3 ? name.toUpperCase() : name
    .replace(/^(Le |La |Les |L')/i, "")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span className="badge" style={{ background: color ?? BADGE_COLORS[hash(name) % BADGE_COLORS.length], width: size, height: size }}>
      {initials}
    </span>
  );
}

export function Ring({ value, max, label, color = "var(--learn)", big }: { value: number; max: number; label: string; color?: string; big?: boolean }) {
  const r = 15;
  const C = 2 * Math.PI * r;
  const p = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className={big ? "ring big" : "ring"} role="img" aria-label={label}>
      <svg viewBox="0 0 38 38">
        <circle cx="19" cy="19" r={r} stroke="var(--line)" strokeWidth="4" fill="none" />
        <circle cx="19" cy="19" r={r} stroke={value > max ? "var(--warn)" : color} strokeWidth="4" fill="none" strokeLinecap="round" strokeDasharray={`${C * p} ${C}`} />
      </svg>
      <b>{label}</b>
    </div>
  );
}

export const minutes = (n?: number) => (!n ? "" : n >= 60 ? `${Math.floor(n / 60)} h ${String(n % 60).padStart(2, "0")}` : `${n} min`);
