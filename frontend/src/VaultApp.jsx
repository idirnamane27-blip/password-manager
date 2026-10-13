import React, { useEffect, useState } from 'react';
import Navigation from './components/Navigation.jsx';
import ConfirmationSuppression from './components/ConfirmationSuppression.jsx';
import Coffre from './pages/Coffre.jsx';
import Favoris from './pages/Favoris.jsx';
import AjouterEntree from './pages/AjouterEntree.jsx';
import ModifierEntree from './pages/ModifierEntree.jsx';
import Generateur from './pages/Generateur.jsx';
import Corbeille from './pages/Corbeille.jsx';
import Parametres from './pages/Parametres.jsx';
import { entriesApi } from './services/api.js';
const getPage = () => {
  const [page, id] = location.hash.slice(1).split('/');
  return { page: ['coffre', 'favoris', 'ajouter', 'modifier', 'generateur', 'corbeille', 'parametres'].includes(page) ? page : 'coffre', id };
};
export default function VaultApp({ user, onUser, onDeleted, onLogout }) {
  const [route, setRoute] = useState(getPage);
  const [entries, setEntries] = useState([]); const [trash, setTrash] = useState([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [notice, setNotice] = useState(''); const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState(null);
  async function load() {
    const [active, removed] = await Promise.all([entriesApi(), entriesApi('?trash=true')]);
    setEntries(active.entries); setTrash(removed.entries);
  }
  async function retry() { setLoading(true); setError(''); try { await load(); } catch (error) { setError(error.message); } finally { setLoading(false); } }
  useEffect(() => { retry(); const update = () => { setRoute(getPage()); setNotice(''); setError(''); }; window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);
  useEffect(() => { document.title = `${({ coffre: 'Mon coffre', favoris: 'Favoris', ajouter: 'Nouvelle entrée', modifier: 'Modifier une entrée', generateur: 'Générateur', corbeille: 'Corbeille', parametres: 'Paramètres' })[route.page]} — Sésame`; }, [route.page]);
  function navigate(page) { location.hash = page; setRoute(getPage()); setError(''); setNotice(''); }
  async function copyText(value) {
    setError(''); setNotice('');
    try { await navigator.clipboard.writeText(value); setNotice('Mot de passe copié.'); }
    catch { setError('Copie impossible. Autorisez l’accès au presse-papiers dans votre navigateur.'); }
  }
  async function copy(entry) { setBusy(true); setError(''); try { const result = await entriesApi(`/${entry.id}/secret`); await copyText(result.password); } catch (error) { setError(error.message); } finally { setBusy(false); } }
  async function mutate(path, body, method, message) {
    setBusy(true); setError('');
    try { await entriesApi(path, body, method); await load(); setNotice(message); }
    catch (error) { setError(error.message); throw error; }
    finally { setBusy(false); }
  }
  const askDelete = entry => setConfirmation({ title: `Supprimer « ${entry.title} » ?`, description: 'Elle sera placée dans la corbeille pendant 30 jours.', path: `/${entry.id}`, method: 'DELETE', message: 'Entrée déplacée dans la corbeille.', back: route.page === 'modifier' });
  const actions = { busy, onCopy: copy, onEdit: entry => navigate(`modifier/${entry.id}`), onDelete: askDelete, onFavorite: entry => { mutate(`/${entry.id}/favorite`, { favorite: !entry.favorite }, 'PATCH', entry.favorite ? 'Favori retiré.' : 'Favori ajouté.').catch(() => {}); } };
  async function confirm() {
    try { await mutate(confirmation.path, undefined, confirmation.method, confirmation.message); const back = confirmation.back; setConfirmation(null); if (back) navigate('coffre'); } catch { /* Le message reste dans la confirmation. */ }
  }
  let content;
  if (loading) content = <p role="status">Chargement du coffre…</p>;
  else if (route.page === 'ajouter') content = <AjouterEntree navigate={navigate} onSaved={load} />;
  else if (route.page === 'modifier') content = <ModifierEntree key={route.id} entry={entries.find(entry => entry.id === route.id)} navigate={navigate} onSaved={load} onDelete={askDelete} />;
  else if (route.page === 'favoris') content = <Favoris entries={entries} {...actions} />;
  else if (route.page === 'generateur') content = <Generateur copyText={copyText} />;
  else if (route.page === 'parametres') content = <Parametres user={user} onUser={onUser} onDeleted={onDeleted} onLogout={onLogout} />;
  else if (route.page === 'corbeille') content = <Corbeille entries={trash} busy={busy} onRestore={entry => { mutate(`/${entry.id}/restore`, {}, 'POST', 'Entrée restaurée.').catch(() => {}); }} onErase={entry => setConfirmation({ title: `Effacer « ${entry.title} » définitivement ?`, description: 'Cette action est irréversible.', confirmLabel: 'Effacer', path: `/${entry.id}?permanent=true`, method: 'DELETE', message: 'Entrée effacée.' })} onEmpty={() => setConfirmation({ title: 'Vider la corbeille ?', description: 'Toutes les entrées de la corbeille seront effacées définitivement.', confirmLabel: 'Vider', path: '/trash', method: 'DELETE', message: 'Corbeille vidée.' })} />;
  else content = <Coffre entries={entries} navigate={navigate} {...actions} />;
  return <div className="vault-shell"><div className="vault-panel"><Navigation page={route.page} navigate={navigate} /><div className="vault-content">
    {error && !confirmation && <div><p className="message error" role="alert">{error}</p><button className="pill" onClick={retry}>Actualiser les données</button></div>}
    {notice && <p className="message success" role="status">{notice}</p>}{content}
  </div></div>{confirmation && <ConfirmationSuppression {...confirmation} busy={busy} error={error} onConfirm={confirm} onCancel={() => { setConfirmation(null); setError(''); }} />}</div>;
}
