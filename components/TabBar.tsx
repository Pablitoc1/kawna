"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "Accueil", cls: "", icon: <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" /> },
  { href: "/actu", label: "Actu", cls: "actu", icon: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M8 9h8M8 13h8M8 17h5" /></> },
  { href: "/divertir", label: "Divertir", cls: "fun", icon: <><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M8 3l4 3 4-3" /></> },
  { href: "/apprendre", label: "Apprendre", cls: "learn", icon: <><path d="M3 9l9-4 9 4-9 4z" /><path d="M7 11v5c3 2 7 2 10 0v-5" /></> },
  { href: "/moi", label: "Moi", cls: "", icon: <><circle cx="12" cy="9" r="4" /><path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" /></> },
];

export function TabBar() {
  const path = usePathname();
  if (path === "/login") return null;
  return (
    <nav className="tabbar" aria-label="Univers">
      {TABS.map((t) => (
        <Link key={t.href} href={t.href} className={t.cls} aria-current={path === t.href ? "page" : undefined}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{t.icon}</svg>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}
