import React, { useState } from 'react';
export default function ChampMotDePasse({ id, label, value, onChange, autoComplete, describedBy }) {
  const [visible, setVisible] = useState(false);
  return <div className="field"><label htmlFor={id}>{label}</label><div className="password-field">
    <input id={id} name={id} type={visible ? 'text' : 'password'} value={value} onChange={onChange} autoComplete={autoComplete} required maxLength={128} aria-describedby={describedBy} />
    <button className="eye-button" type="button" onClick={() => setVisible(!visible)} aria-label={`${visible ? 'Masquer' : 'Afficher'} ${label.toLowerCase()}`} aria-pressed={visible}>
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{visible && <path d="m3 3 18 18" />}</svg>
    </button>
  </div></div>;
}
