import React from 'react';
import Logo from './Logo.jsx';
export default function Navigation({ page, navigate }) {
  return <><header className="vault-header"><a href="#coffre" className="brand-link" aria-label="Sésame — ouvrir le coffre"><Logo /></a><nav aria-label="Navigation principale">{[['coffre', 'Coffre'], ['favoris', 'Favoris'], ['generateur', 'Générateur'], ['corbeille', 'Corbeille'], ['parametres', 'Paramètres']].map(([value, label]) => <a key={value} href={`#${value}`} onClick={() => navigate(value)} className={`pill ${page === value ? 'selected' : ''}`} aria-current={page === value ? 'page' : undefined}>{label}</a>)}</nav></header></>;
}
