import React, { useEffect, useRef } from 'react';
export default function ConfirmationSuppression({ title, description, confirmLabel = 'Supprimer', onConfirm, onCancel, busy, error }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog ref={ref} className="confirmation-dialog" aria-labelledby="confirmation-title" aria-describedby="confirmation-description" onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="confirmation-title">{title}</h2><p id="confirmation-description">{description}</p>{error && <p role="alert" className="message error">{error}</p>}<div className="form-actions"><button autoFocus className="outline" disabled={busy} onClick={onCancel}>Annuler</button><button className="primary" disabled={busy} onClick={onConfirm}>{busy ? 'Traitement…' : confirmLabel}</button></div>
  </dialog>;
}
