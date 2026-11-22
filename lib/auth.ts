export const COOKIE = "kawna_session";

/** Jeton de session dérivé du mot de passe : changer le mot de passe déconnecte tous les appareils. */
export async function sessionToken(password: string) {
  const data = new TextEncoder().encode(`kawna:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
