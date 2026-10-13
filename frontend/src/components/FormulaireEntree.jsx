import React, { useState } from 'react';
import { generatePassword } from '../services/generator.js';
export default function FormulaireEntree({ initial, title, onSave, onCancel, onDelete }) {
  const [values, setValues] = useState(initial || { title: '', identifier: '', password: '', url: '', category: 'Perso' });
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const change = field => event => setValues(previous => ({ ...previous, [field]: event.target.value }));
  async function submit(event) { event.preventDefault(); setBusy(true); setError(''); try { await onSave(values); } catch (error) { setError(error.message); } finally { setBusy(false); } }
  return <><h1>{title}</h1><form className="entry-form" onSubmit={submit}><fieldset disabled={busy}>
    <div className="field"><label htmlFor="entry-title">Titre</label><input id="entry-title" value={values.title} onChange={change('title')} required maxLength={100} placeholder="GitHub" /></div>
    <div className="field"><label htmlFor="entry-identifier">Identifiant</label><input id="entry-identifier" value={values.identifier} onChange={change('identifier')} required maxLength={254} placeholder="alex@mail.fr" autoComplete="off" /></div>
    <div className="field"><label htmlFor="entry-password">Mot de passe</label><div className="entry-password"><input id="entry-password" type={visible ? 'text' : 'password'} value={values.password} onChange={change('password')} required maxLength={128} autoComplete="new-password" /><div><button type="button" onClick={() => setVisible(!visible)} aria-pressed={visible}>{visible ? 'Masquer' : 'Afficher'}</button><button type="button" onClick={() => setValues(previous => ({ ...previous, password: generatePassword() }))}>Générer</button></div></div></div>
    <div className="field"><label htmlFor="entry-url">URL <span className="optional">(facultatif)</span></label><input id="entry-url" type="url" value={values.url} onChange={change('url')} maxLength={2048} placeholder="https://github.com" /></div>
    <div className="field"><label htmlFor="entry-category">Catégorie</label><select id="entry-category" value={values.category} onChange={change('category')}>{['Travail', 'Perso', 'Banque'].map(category => <option key={category}>{category}</option>)}</select></div>
    {error && <p className="message error" role="alert">{error}</p>}
    <div className="form-actions"><button className="outline" type="button" onClick={onCancel}>Annuler</button><button className="primary" type="submit">{busy ? 'Enregistrement…' : 'Enregistrer'}</button></div>
    {onDelete && <button type="button" className="outline full-width delete-entry" onClick={onDelete}>Supprimer cette entrée</button>}
  </fieldset></form></>;
}
