import React, { useState } from 'react';
import { api } from '../services/api.js';
import ChampMotDePasse from '../components/ChampMotDePasse.jsx';
import IndicateurForce from '../components/IndicateurForce.jsx';
export default function Parametres({ user, onUser, onDeleted, onLogout }) {
  const [mode, setMode] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [values, setValues] = useState({ username: user.username, email: user.email, currentPassword: '', password: '', confirmation: '' });
  const change = name => event => setValues(previous => ({ ...previous, [name]: event.target.value }));
  function open(next) { setMode(next); setError(''); setMessage(''); setValues({ username: user.username, email: user.email, currentPassword: '', password: '', confirmation: '' }); }
  async function save(event) {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const result = await api(mode === 'delete' ? '/account' : `/${mode}`, values, mode === 'delete' ? 'DELETE' : 'PATCH');
      if (mode === 'delete') onDeleted(); else { onUser(result.user); setMode(''); setValues(previous => ({ ...previous, currentPassword: '', password: '', confirmation: '' })); setMessage(mode === 'password' ? 'Mot de passe maître modifié. Les autres sessions ont été fermées.' : 'Informations du compte mises à jour.'); }
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  async function logout() { setBusy(true); setError(''); try { await onLogout(); } catch (error) { setError(error.message); } finally { setBusy(false); } }
  return <><h1>Paramètres</h1><h2 className="section-label">Compte</h2><div className="settings-row"><p>{user.username} · {user.email}</p><button className="pill" disabled={busy} onClick={() => open('profile')}>Modifier</button></div><div className="settings-row"><p>Mot de passe maître</p><button className="pill" disabled={busy} onClick={() => open('password')}>Changer</button></div>
    {message && <p className="message success" role="status">{message}</p>}
    {mode && <section className="settings-editor"><h2>{mode === 'profile' ? 'Modifier mon compte' : mode === 'password' ? 'Changer le mot de passe maître' : 'Supprimer définitivement mon compte'}</h2>{mode === 'delete' && <p className="muted">Votre compte et toutes ses entrées, y compris la corbeille, seront effacés. Cette action est irréversible.</p>}<form onSubmit={save}><fieldset disabled={busy}>
      {mode === 'profile' && <><div className="field"><label htmlFor="settings-username">Nom d’utilisateur</label><input id="settings-username" value={values.username} onChange={change('username')} minLength={3} maxLength={30} pattern="[a-zA-Z0-9_.-]{3,30}" required /></div><div className="field"><label htmlFor="settings-email">Adresse e-mail</label><input id="settings-email" type="email" value={values.email} onChange={change('email')} maxLength={254} required /></div></>}
      <ChampMotDePasse id="settings-current-password" label="Mot de passe maître actuel" value={values.currentPassword} onChange={change('currentPassword')} autoComplete="current-password" />
      {mode === 'password' && <><ChampMotDePasse id="settings-new-password" label="Nouveau mot de passe maître" value={values.password} onChange={change('password')} autoComplete="new-password" describedBy="password-help" /><IndicateurForce password={values.password} /><ChampMotDePasse id="settings-confirmation" label="Confirmer le nouveau mot de passe" value={values.confirmation} onChange={change('confirmation')} autoComplete="new-password" /></>}
      {mode === 'delete' && <div className="field"><label htmlFor="delete-confirmation">Tapez SUPPRIMER pour confirmer</label><input id="delete-confirmation" value={values.confirmation} onChange={change('confirmation')} required pattern="SUPPRIMER" autoComplete="off" /></div>}
      {error && <p role="alert" className="message error">{error}</p>}<div className="form-actions"><button className="outline" type="button" onClick={() => open('')}>Annuler</button><button className="primary" type="submit">{busy ? 'Traitement…' : mode === 'delete' ? 'Confirmer la suppression' : 'Enregistrer'}</button></div>
    </fieldset></form></section>}
    {!mode && error && <p role="alert" className="message error">{error}</p>}
    <div className="settings-bottom"><button className="outline full-width" disabled={busy} onClick={logout}>Se déconnecter</button><button className="outline full-width danger" disabled={busy} onClick={() => open('delete')}>Supprimer mon compte</button></div>
  </>;
}
