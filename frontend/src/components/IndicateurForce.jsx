import React from 'react';
export function passwordLevel(password) {
  if (!password) return 0;
  const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(rule => rule.test(password)).length;
  if (password.length >= 16 && types >= 3) return 3;
  if (password.length >= 12 && types >= 2) return 2;
  return 1;
}
export default function IndicateurForce({ password }) {
  const level = passwordLevel(password);
  return <div id="password-help" className={`strength strength-${level}`}>
    <div className="strength-track" aria-hidden="true">{[1, 2, 3].map(segment => <span key={segment} className={segment <= level ? 'active' : ''} />)}</div>
    <div className="strength-caption"><span>12 caractères minimum</span><span aria-live="polite">{['', 'Faible', 'Fort', 'Très fort'][level]}</span></div>
  </div>;
}
