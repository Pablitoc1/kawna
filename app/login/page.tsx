export default async function Login({ searchParams }: { searchParams: Promise<{ erreur?: string }> }) {
  const { erreur } = await searchParams;
  return (
    <form className="login" method="post" action="/api/login">
      <div className="logo"><i />kawna</div>
      <input id="password" name="password" type="password" placeholder="Mot de passe" autoComplete="current-password" required autoFocus />
      {erreur && <p className="mute" role="alert">Mot de passe incorrect.</p>}
      <button className="pill solid" type="submit">Entrer</button>
    </form>
  );
}
