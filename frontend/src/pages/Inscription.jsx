import React, { useState } from 'react';
import { api } from '../services/api.js';
import ChampMotDePasse from '../components/ChampMotDePasse.jsx';
import IndicateurForce from '../components/IndicateurForce.jsx';
export default function Inscription({ onSuccess, navigate }) {
  const [values, setValues] = useState({ username: '', email: '', password: '', confirmation: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const change = name => event => setValues(previous => ({ ...previous, [name]: event.target.value }));
  async function submit(event) {
    event.preventDefault(); setError('');
    if (values.password !== values.confirmation) return setError('Les deux mots de passe ne correspondent pas.');
    if (values.password.length < 12) return setError('Choisissez un mot de passe maître d’au moins 12 caractères.');
    setBusy(true);
    try { const result = await api('/register', values); setValues({ username: '', email: '', password: '', confirmation: '' }); onSuccess(result.user); }
    catch (error) { setError(error.message); }
    finally { setBusy(false); }
  }
  return <><header className="card-heading"><h1>Créer un compte</h1><p>Votre tranquillité commence ici.</p></header>
    <form onSubmit={submit}><fieldset disabled={busy}>
      <div className="field"><label htmlFor="username">Nom d’utilisateur</label><input id="username" name="username" value={values.username} onChange={change('username')} autoComplete="username" required minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.-]{3,30}" title="3 à 30 caractères : lettres, chiffres, point, tiret ou underscore." placeholder="alex" /></div>
      <div className="field"><label htmlFor="email">Adresse e-mail</label><input id="email" name="email" type="email" value={values.email} onChange={change('email')} autoComplete="email" required maxLength={254} placeholder="alex@exemple.fr" /></div>
      <ChampMotDePasse id="password" label="Mot de passe maître" value={values.password} onChange={change('password')} autoComplete="new-password" describedBy="password-help" />
      <IndicateurForce password={values.password} />
      <ChampMotDePasse id="confirmation" label="Confirmer le mot de passe" value={values.confirmation} onChange={change('confirmation')} autoComplete="new-password" />
      {error && <p className="message error" role="alert">{error}</p>}
      <button className="primary" type="submit">{busy ? 'Création en cours…' : 'Créer mon compte'}<span aria-hidden="true">→</span></button>
    </fieldset></form>
    <p className="switch-page">Déjà un compte ? <a href="#connexion" onClick={() => navigate('connexion')}>Se connecter</a></p>
  </>;
}
