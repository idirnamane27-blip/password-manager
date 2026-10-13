import React, { useState } from 'react';
import { api } from '../services/api.js';
import ChampMotDePasse from '../components/ChampMotDePasse.jsx';
export default function Connexion({ onSuccess, navigate }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { const result = await api('/login', { username, password }); setPassword(''); onSuccess(result.user); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <><header className="card-heading"><h1>Connexion</h1><p>Heureux de vous retrouver.</p></header>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <div className="field"><label htmlFor="username">Nom d’utilisateur</label><input id="username" name="username" value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required maxLength={30} placeholder="alex" /></div>
      <ChampMotDePasse id="password" label="Mot de passe maître" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" />
      {error && <p className="message error" role="alert">{error}</p>}
      <button className="primary" type="submit">{busy ? 'Connexion en cours…' : 'Se connecter'}<span aria-hidden="true">→</span></button>
    </fieldset></form>
    <p className="switch-page">Pas de compte ? <a href="#inscription" onClick={() => navigate('inscription')}>Créer un compte</a></p>
  </>;
}
