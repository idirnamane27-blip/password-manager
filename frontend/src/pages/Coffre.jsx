import React, { useState } from 'react';
import EntryList from '../components/EntryList.jsx';
export default function Coffre({ entries, navigate, ...actions }) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tous');
  const filtered = entries.filter(entry => (category === 'Tous' || entry.category === category) && `${entry.title} ${entry.identifier} ${entry.url}`.toLocaleLowerCase('fr').includes(query.toLocaleLowerCase('fr'))).sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  return <><h1 className="visually-hidden">Mon coffre</h1><input className="search" type="search" aria-label="Rechercher dans le coffre" placeholder="Rechercher" value={query} onChange={event => setQuery(event.target.value)} /><div className="category-filters" aria-label="Catégories">{['Tous', 'Travail', 'Perso', 'Banque'].map(value => <button key={value} className={`pill ${category === value ? 'selected' : ''}`} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</button>)}</div>
    {filtered.length ? <EntryList entries={filtered} {...actions} /> : <p className="empty-state">{entries.length ? 'Aucune entrée ne correspond à votre recherche.' : 'Votre coffre est vide. Ajoutez votre première entrée.'}</p>}
    <button className="primary add-entry" onClick={() => navigate('ajouter')}>＋ Ajouter une entrée</button>
  </>;
}
