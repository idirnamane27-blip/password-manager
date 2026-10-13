import React, { useState } from 'react';
import EntryList from '../components/EntryList.jsx';
export default function Favoris({ entries, ...actions }) {
  const [query, setQuery] = useState(''); const [sort, setSort] = useState('name');
  const filtered = entries.filter(entry => `${entry.title} ${entry.identifier} ${entry.category}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => sort === 'name' ? a.title.localeCompare(b.title, 'fr') : Date.parse(b[sort]) - Date.parse(a[sort]));
  const favorites = filtered.filter(entry => entry.favorite), other = filtered.filter(entry => !entry.favorite);
  return <><h1 className="visually-hidden">Favoris et tri</h1><div className="search-and-sort"><input type="search" placeholder="Rechercher" aria-label="Rechercher dans les favoris et les entrées" value={query} onChange={event => setQuery(event.target.value)} /><select aria-label="Trier les entrées" value={sort} onChange={event => setSort(event.target.value)}><option value="name">Tri : A–Z</option><option value="createdAt">Date d’ajout</option><option value="updatedAt">Dernière modification</option></select></div>
    <h2 className="section-label">Favoris</h2>{favorites.length ? <EntryList compact entries={favorites} {...actions} /> : <p className="empty-state small">Aucun favori. Cliquez sur une étoile pour en ajouter.</p>}
    <h2 className="section-label">Toutes les autres entrées</h2>{other.length ? <EntryList compact entries={other} {...actions} /> : <p className="empty-state small">Aucune autre entrée.</p>}
    <p className="muted list-note">Tris possibles : nom, date d’ajout, dernière modification.</p>
  </>;
}
