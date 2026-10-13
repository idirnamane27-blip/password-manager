import React, { useState, useEffect } from 'react';
import FormulaireEntree from '../components/FormulaireEntree.jsx';
import { entriesApi } from '../services/api.js';
export default function ModifierEntree({ entry, onSaved, navigate, onDelete }) {
  const [values, setValues] = useState(null); const [error, setError] = useState(''); const [retry, setRetry] = useState(0);
  useEffect(() => { let active = true; setValues(null); setError(''); if (entry) entriesApi(`/${entry.id}/secret`).then(result => { if (active) setValues({ ...entry, password: result.password }); }).catch(error => { if (active) setError(error.message); }); return () => { active = false; }; }, [entry?.id, retry]);
  if (!entry) return <><h1>Entrée introuvable</h1><button className="outline" onClick={() => navigate('coffre')}>Retour au coffre</button></>;
  if (error) return <><p className="message error" role="alert">{error}</p><button className="outline" onClick={() => setRetry(value => value + 1)}>Réessayer</button></>;
  if (!values) return <p role="status">Chargement de l’entrée…</p>;
  async function save(data) { await entriesApi(`/${entry.id}`, data, 'PUT'); await onSaved(); navigate('coffre'); }
  return <FormulaireEntree key={entry.id} initial={values} title={`Modifier « ${entry.title} »`} onSave={save} onCancel={() => navigate('coffre')} onDelete={() => onDelete(entry)} />;
}
