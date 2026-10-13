import React from 'react';
import FormulaireEntree from '../components/FormulaireEntree.jsx';
import { entriesApi } from '../services/api.js';
export default function AjouterEntree({ onSaved, navigate }) {
  async function save(values) { await entriesApi('', values); await onSaved(); navigate('coffre'); }
  return <FormulaireEntree title="Nouvelle entrée" onSave={save} onCancel={() => navigate('coffre')} />;
}
