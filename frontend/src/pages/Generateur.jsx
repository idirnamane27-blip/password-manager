import React, { useState } from 'react';
import { generatePassword, presets } from '../services/generator.js';
import { passwordLevel } from '../components/IndicateurForce.jsx';
export default function Generateur({ copyText }) {
  const [options, setOptions] = useState(presets.tresFort);
  const [password, setPassword] = useState(() => generatePassword());
  const [preset, setPreset] = useState('tresFort');
  const level = passwordLevel(password);
  function update(next, selected = '') { setOptions(next); setPreset(selected); setPassword(generatePassword(next)); }
  return <><h1>Générateur de mot de passe</h1><div className="generated-output"><output aria-label="Mot de passe généré">{password}</output><button className="pill" onClick={() => copyText(password)}>Copier</button></div>
    <div className={`generator-strength strength-${level}`}><div className="strength-track" aria-hidden="true">{[1, 2, 3].map(value => <span key={value} className={value <= level ? 'active' : ''} />)}</div><p>Niveau : {['', 'faible', 'fort', 'très fort'][level]}</p></div>
    <div className="category-filters">{[['faible', 'Faible'], ['fort', 'Fort'], ['tresFort', 'Très fort']].map(([key, label]) => <button className={`pill ${preset === key ? 'selected' : ''}`} aria-pressed={preset === key} key={key} onClick={() => update(presets[key], key)}>{label}</button>)}</div>
    <label className="range-label" htmlFor="generator-length">Longueur <strong>{options.length}</strong></label><input id="generator-length" type="range" min="6" max="64" value={options.length} onChange={event => update({ ...options, length: Number(event.target.value) })} />
    <div className="generator-options">{[['uppercase', 'Majuscules'], ['digits', 'Chiffres'], ['symbols', 'Symboles']].map(([key, label]) => <label key={key} htmlFor={`generator-${key}`}>{label}<input id={`generator-${key}`} type="checkbox" checked={options[key]} onChange={event => update({ ...options, [key]: event.target.checked })} /></label>)}</div>
    <button className="primary" onClick={() => setPassword(generatePassword(options))}>Régénérer</button><p className="muted list-note">Les niveaux sont indicatifs. Privilégiez un mot de passe long et unique.</p>
  </>;
}
