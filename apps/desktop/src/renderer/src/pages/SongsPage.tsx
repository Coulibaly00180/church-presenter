import React from "react";
import { Link } from "react-router-dom";

/**
 * Page "Chants" = bibliothèque.
 * Pour l'instant, ton CRUD chants est dans Régie (par choix MVP).
 * On laissera cette page comme entrée dédiée puis on déplacera le CRUD ici.
 */
export function SongsPage() {
  return (
    <div style={{ fontFamily: "system-ui", padding: 16 }}>
      <h1 style={{ margin: 0 }}>Chants</h1>
      <p style={{ opacity: 0.75, marginTop: 8 }}>
        Bibliothèque de chants (CRUD + recherche). Dans ton MVP actuel, cette partie est encore dans{" "}
        <Link to="/regie">Régie</Link>.
      </p>

      <div style={{ border: "1px solid #e6e6e6", borderRadius: 12, padding: 12, marginTop: 12 }}>
        <div style={{ fontWeight: 800 }}>Prochaines évolutions</div>
        <ul style={{ marginTop: 8, lineHeight: 1.6 }}>
          <li>Déplacer le CRUD chants ici (liste + édition + blocs).</li>
          <li>Recherche full-text dans titres + paroles.</li>
          <li>Import/Export JSON chants.</li>
        </ul>
      </div>
    </div>
  );
}
