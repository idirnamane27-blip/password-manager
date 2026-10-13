import React, { useEffect, useState } from 'react';
import Inscription from './pages/Inscription.jsx';
import Connexion from './pages/Connexion.jsx';
import Logo from './components/Logo.jsx';
import { api } from './services/api.js';
import VaultApp from './VaultApp.jsx';
const currentPage = () => location.hash === '#connexion' ? 'connexion' : 'inscription';
export default function App() {
  const [page, setPage] = useState(currentPage);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionError, setSessionError] = useState('');
  async function checkSession() {
    setLoading(true); setSessionError('');
    try { setUser((await api('/me')).user); }
    catch (error) { if (error.status !== 401) setSessionError(error.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { checkSession(); const update = () => setPage(currentPage()); window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);
  useEffect(() => { if (!user) document.title = `${page === 'connexion' ? 'Connexion' : 'Créer un compte'} — Sésame`; }, [page, user]);
  function navigate(next) { location.hash = next; setPage(next); }
  useEffect(() => {
    const expired = () => { setUser(null); navigate('connexion'); };
    window.addEventListener('session-expired', expired);
    return () => window.removeEventListener('session-expired', expired);
  }, []);
  function authenticated(nextUser) { setUser(nextUser); location.hash = 'coffre'; }
  async function logout() {
    await api('/logout', {}); setUser(null); navigate('connexion');
  }
  if (user && !loading) return <VaultApp key={user.id} user={user} onUser={setUser} onDeleted={() => { setUser(null); navigate('inscription'); }} onLogout={logout} />;
  return <div className="app-shell"><header className="site-header"><Logo /><span className="header-note">Un seul mot de passe. Votre esprit libre.</span></header>
    <main><div className="intro"><span className="eyebrow">VOTRE ESPACE PERSONNEL</span><h2>La clé de votre<br /><span>tranquillité.</span></h2><p>Un espace simple pour garder le contrôle<br className="desktop-break" /> de vos accès.</p></div>
      <section className="auth-card" aria-label={user ? 'Session ouverte' : 'Authentification'}>
        <div className="card-symbol" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="5" y="10" width="14" height="11" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2" /></svg></div>
        {loading ? <p role="status">Vérification de la session…</p> : sessionError ? <><h1>Connexion au serveur</h1><p className="message error" role="alert">{sessionError}</p><button className="primary" onClick={checkSession}>Réessayer</button></> : page === 'connexion' ? <Connexion navigate={navigate} onSuccess={authenticated} /> : <Inscription navigate={navigate} onSuccess={authenticated} />}
      </section>
    </main><footer><span>© {new Date().getFullYear()} Sésame</span><span>Projet Processus du développement logiciel</span></footer>
  </div>;
}
