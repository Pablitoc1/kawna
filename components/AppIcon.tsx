/** Logo kawna : un carré aux trois couleurs des univers. Utilisé pour les icônes générées. */
export function AppIcon({ size }: { size: number }) {
  const r = size * 0.22;
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#0e1312" }}>
      <div
        style={{
          width: size * 0.62,
          height: size * 0.62,
          borderRadius: r,
          background: "linear-gradient(135deg, #e8a33d 0%, #e2557a 50%, #4fb3a0 100%)",
          display: "flex",
        }}
      />
    </div>
  );
}
