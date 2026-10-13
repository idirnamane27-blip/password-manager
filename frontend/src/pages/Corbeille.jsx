import React from 'react';
export default function Corbeille({ entries, onRestore, onErase, onEmpty, busy }) {
  return <><div className="page-title-row"><h1>Corbeille</h1><button className="pill" disabled={busy || !entries.length} onClick={onEmpty}>Vider</button></div><p className="muted">Les entrées sont supprimées définitivement après 30 jours.</p>
    {!entries.length ? <p className="empty-state">La corbeille est vide.</p> : <div className="entry-list">{[...entries].sort((a, b) => Date.parse(b.deletedAt) - Date.parse(a.deletedAt)).map(entry => {
      const days = Math.max(0, Math.floor((Date.now() - Date.parse(entry.deletedAt)) / 86400000));
      return <article className="trash-row" key={entry.id}><div><h2>{entry.title}</h2><p className="muted">{days === 0 ? 'Supprimée aujourd’hui' : `Supprimée il y a ${days} jour${days > 1 ? 's' : ''}`}</p></div><div className="entry-actions"><button className="pill selected" disabled={busy} onClick={() => onRestore(entry)}>Restaurer</button><button className="pill" disabled={busy} onClick={() => onErase(entry)}>Effacer</button></div></article>;
    })}</div>}
  </>;
}
