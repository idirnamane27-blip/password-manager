import React from 'react';
export default function EntryList({ entries, onCopy, onEdit, onDelete, onFavorite, compact = false, busy }) {
  return <div className="entry-list">{entries.map(entry => <article className={`entry-row ${compact ? 'compact' : ''}`} key={entry.id}>
    <div className="entry-information"><button className="star-button" aria-label={`${entry.favorite ? 'Retirer' : 'Ajouter'} ${entry.title} ${entry.favorite ? 'des' : 'aux'} favoris`} aria-pressed={entry.favorite} onClick={() => onFavorite(entry)} disabled={busy}>{entry.favorite ? '★' : '☆'}</button><div><h2>{entry.title}</h2><p>{compact ? entry.category : entry.identifier}</p></div></div>
    {!compact && <span className="masked-password" aria-label="Mot de passe masqué">••••••••</span>}
    <div className="entry-actions"><button className="pill" disabled={busy} onClick={() => onCopy(entry)}>Copier</button>{!compact && <><button className="pill" onClick={() => onEdit(entry)} disabled={busy}>Modifier</button><button className="pill" onClick={() => onDelete(entry)} disabled={busy}>Supprimer</button></>}</div>
  </article>)}</div>;
}
