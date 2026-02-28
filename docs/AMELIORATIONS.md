# Church Presenter — Idées d'améliorations

> Document créé le 2026-02-28 à partir de l'analyse du code existant.
> Les fonctionnalités listées sont des **propositions**, pas des engagements.
> Le projet de base (live, projection, chants, Bible, plans, médias) est fonctionnel.

---

## Stratégie de branches Git

```text
main          ← production stable, jamais de commit direct
  └── dev     ← intégration des features, base de toutes les branches feature
        ├── feat/H2-video-annonces
        ├── feat/H1-tags-chants
        ├── feat/H3-templates-plan
        └── ...
```

**Règles :**

- `main` : ne reçoit que des merges depuis `dev` (via PR), quand la feature est validée
- `dev` : branche d'intégration — base de départ pour chaque feature
- `feat/<ID>-<slug>` : une branche par feature, créée depuis `dev`
  - ex. `feat/H2-video-annonces`, `feat/H1-tags-chants`
- Chaque feature est mergée dans `dev` via PR avant de passer en `main`
- Nommage des commits : `feat:`, `fix:`, `refactor:`, `docs:`, `test:`

---

## Statut des éléments

| Icône | Signification                                    |
| ----- | ------------------------------------------------ |
| 🔴    | Haute priorité — impact utilisateur direct       |
| 🟠    | Priorité moyenne — amélioration notable          |
| 🟡    | Priorité basse — polish / confort                |
| ✅    | Implémenté                                       |
| 🚧    | Partiel / infrastructure présente, UI manquante  |

---

## 🔴 Haute priorité

### H1 — Interface tags pour les chants

**Contexte :** Le champ `tags` existe en base de données et dans les types, mais aucune UI ne permet de les modifier ni de filtrer par tag.

**À faire :**

- Champ multi-tag dans le formulaire d'édition d'un chant (`SongEditorDialog`)
- Filtre par tag(s) dans l'onglet Chants (`SongsTab`)
- Badge de tag sur les cartes de chant

---

### H2 — Vidéo dans les annonces (ANNOUNCEMENT_VIDEO)

**Contexte :** Le kind `ANNOUNCEMENT_VIDEO` est défini, accepté en projection et dans `MediaTab`, mais l'onglet Annonces ne propose pas de bouton "Vidéo" — seuls Image et PDF y sont disponibles.

**À faire :**

- Ajouter le bouton "Vidéo" dans `AnnouncementsTab.tsx`
- Vérifier la cohérence avec le contrôle de volume (`live.videoVolume` IPC existe mais n'a pas de slider dans la régie)

---

### H3 — Templates de plan

**Contexte :** Les types `CpPlanTemplate` et les handlers IPC (`getTemplates` / `setTemplates`) existent, mais aucune UI ne permet de créer, appliquer ou supprimer un template.

**À faire :**

- Onglet "Templates" dans les Paramètres pour gérer les templates sauvegardés
- Bouton "Créer depuis ce plan" dans la toolbar du plan
- Sélecteur de template lors de la création d'un nouveau plan

---

### H4 — Multi-sélection d'items dans le plan

**Contexte :** Il est impossible de sélectionner plusieurs items pour les supprimer ou réordonner en groupe. L'IPC `plans:removeItems` (bulk) existe déjà côté backend.

**À faire :**

- Mode sélection activé par Maj+clic ou case à cocher
- Actions groupées : supprimer, déplacer vers le haut/bas
- Sélectionner tout / désélectionner

---

### H5 — Copier / coller des items de plan

**À faire :**

- Copier un item (ou une sélection) avec Ctrl+C
- Coller dans le même plan ou dans un autre plan ouvert
- Dupliquer un item en conservant son fond personnalisé

---

### H6 — Tri de la bibliothèque de chants

**Contexte :** Les chants sont toujours triés par pertinence de recherche. Aucun contrôle de tri manuel n'existe.

**À faire :**

- Sélecteur de tri : par titre, artiste, album, date d'ajout, fréquence d'utilisation
- Mémoriser le tri sélectionné entre sessions

---

### H7 — Pagination / scroll infini pour les chants

**Contexte :** Toute la bibliothèque est chargée en mémoire. Sur de grandes bibliothèques (500+ chants), l'UI peut ralentir.

**À faire :**

- Pagination côté IPC (`songs:list` avec `offset` + `limit`)
- Scroll infini dans `SongsTab` (charger la prochaine page au bas de la liste)

---

## 🟠 Priorité moyenne

### M1 — Annuler / refaire les modifications du plan

**Contexte :** Aucun historique d'actions. Une suppression accidentelle oblige à recréer l'item.

**À faire :**

- Historique en mémoire des 20 dernières actions (add, remove, reorder, update)
- Raccourcis Ctrl+Z / Ctrl+Maj+Z dans `PlanEditor`

---

### M2 — Éditeur de bas d'écran (lower-third)

**Contexte :** `CpProjectionState` contient un champ `lowerThird` mais il n'y a pas d'UI pour le configurer ou l'activer depuis la régie.

**À faire :**

- Panneau "Bas d'écran" dans les paramètres de projection ou la LiveBar
- Champs : texte, taille, position, couleur de fond
- Bouton activer / désactiver depuis la régie

---

### M3 — Transitions entre slides

**Contexte :** Le flag `transitionEnabled` existe dans les types de projection mais n'est pas implémenté dans `ProjectionPage`.

**À faire :**

- Transition fondu (fade) basique entre slides via CSS `transition`
- Option activable par profil d'écran

---

### M4 — Vue miniature du plan (slide sorter)

**À faire :**

- Vue grille des slides du plan actif (comme le "slide sorter" de PowerPoint)
- Clic pour projeter directement
- Drag-drop pour réordonner dans cette vue

---

### M5 — Recherche Bible hors ligne

**Contexte :** La recherche textuelle actuelle passe par l'API Bolls (internet requis). La LSG 1910 est pourtant embarquée localement dans la base de données.

**À faire :**

- Index SQLite FTS5 sur le contenu des versets LSG 1910
- Résultats de recherche hors ligne instantanés
- Conserver la recherche en ligne pour les autres traductions

---

### M6 — Import de traductions Bible supplémentaires

**Contexte :** Seule la LSG 1910 est disponible hors ligne. Les autres traductions passent par l'API Bolls.

**À faire :**

- Permettre l'import de fichiers OSIS ou USFM
- Stocker la traduction importée en base SQLite locale
- Interface dans les Paramètres pour gérer les traductions installées

---

### M7 — Détection de doublons à l'import de chants

**Contexte :** L'import JSON crée des doublons si un chant du même titre/artiste existe déjà.

**À faire :**

- Comparer titre + artiste lors de l'import
- Proposer : ignorer / remplacer / renommer
- Rapport de résultat après import

---

### M8 — Export complet avec médias

**Contexte :** L'export JSON (`data:export`) n'inclut pas les fichiers images, vidéos et polices référencés.

**À faire :**

- Option "Export complet" qui génère un `.zip` contenant le JSON + tous les médias
- Import correspondant qui reconstitue les fichiers dans `userData/media/`

---

## 🟡 Priorité basse

### L1 — Contrôle du volume vidéo dans la régie

**Contexte :** L'IPC `live.videoVolume` et la diffusion WebSocket existent mais il n'y a pas de slider dans la régie.

**À faire :**

- Slider de volume dans la `LiveBar` lorsqu'une vidéo est projetée

---

### L2 — Indicateur de sauvegarde

**À faire :**

- Badge ou toast discret "Enregistré" après chaque modification
- Indicateur d'état (syncing…) si la base SQLite est occupée

---

### L3 — Sélection du dossier bibliothèque dans l'UI

**Contexte :** `libraryDir` est configurable via IPC mais aucun UI de sélection de dossier n'est exposé dans les Paramètres.

**À faire :**

- Bouton "Choisir le dossier de bibliothèque" dans `SettingsDialog`
- Afficher le chemin actuel

---

### L4 — Sauvegarde automatique de la base

**Contexte :** `db:migrate:safe` fait un backup manuel avant migration, mais il n'y a pas de sauvegarde périodique automatique.

**À faire :**

- Backup automatique quotidien (ou au démarrage) vers `userData/backups/`
- Rotation : conserver les 7 derniers backups
- UI de restauration dans les Paramètres

---

### L5 — WebSocket étendu (télécommande)

**Contexte :** Le serveur WebSocket ne supporte que les commandes `live.*`. Aucune app mobile ou page web ne peut naviguer dans les chants ou changer de plan.

**À faire :**

- Exposer `plans:list`, `plans:select`, `live:setCursor` via WebSocket
- Page web légère (HTML + JS) embarquée comme télécommande locale
- QR code dans l'UI pour accéder à la télécommande

---

### L6 — Statistiques d'utilisation

**À faire :**

- Chants les plus projetés (sur 30/90/365 jours)
- Chants jamais utilisés (candidats à l'archivage)
- Plans par mois (calendrier heatmap)

---

### L7 — Notes opérateur visibles en régie

**Contexte :** Le champ `notes` existe sur les items de plan (notes privées régie) mais n'est affiché nulle part dans la régie pendant la projection.

**À faire :**

- Afficher les notes de l'item courant dans la `LiveBar` ou en overlay régie
- Jamais visible côté projection

---

## Sécurité / Qualité de code

Ces points ne sont pas des features visibles mais améliorent la robustesse.

### S1 — Validation `isPathInDir()` dans `plans:addItem`

**Contexte :** Les handlers `files:*` valident tous les chemins avec `isPathInDir()`, mais `plans:addItem` et `plans:duplicate` stockent `mediaPath` sans cette vérification.

**À faire :**

- Ajouter la validation dans `parsePlanAddItemPayload()` côté `runtimeValidation.ts`

---

### S2 — Validation du schéma `backgroundConfig`

**Contexte :** `JSON.parse(item.backgroundConfig) as CpItemBackground` n'effectue aucune validation runtime.

**À faire :**

- Extraire une fonction `parseCpItemBackground(raw: string): CpItemBackground` avec validation des champs (couleurs hex, angle 0-360, etc.)
- L'appeler partout où `backgroundConfig` est parsé

---

## Récapitulatif

| #  | Feature                        | Priorité | Effort  |
| -- | ------------------------------ | -------- | ------- |
| H1 | Tags chants (UI + filtre)      | 🔴       | Moyen   |
| H2 | Vidéo dans Annonces            | 🔴       | Petit   |
| H3 | Templates de plan (UI)         | 🔴       | Moyen   |
| H4 | Multi-sélection items plan     | 🔴       | Moyen   |
| H5 | Copier/coller items plan       | 🔴       | Petit   |
| H6 | Tri bibliothèque chants        | 🔴       | Petit   |
| H7 | Pagination chants              | 🔴       | Moyen   |
| M1 | Annuler/refaire plan           | 🟠       | Grand   |
| M2 | Éditeur lower-third            | 🟠       | Moyen   |
| M3 | Transitions slides             | 🟠       | Petit   |
| M4 | Vue miniature plan             | 🟠       | Grand   |
| M5 | Recherche Bible hors ligne     | 🟠       | Grand   |
| M6 | Import traductions Bible       | 🟠       | Grand   |
| M7 | Détection doublons import      | 🟠       | Petit   |
| M8 | Export complet avec médias     | 🟠       | Moyen   |
| L1 | Volume vidéo régie             | 🟡       | Petit   |
| L2 | Indicateur sauvegarde          | 🟡       | Petit   |
| L3 | Dossier bibliothèque dans UI   | 🟡       | Petit   |
| L4 | Backup automatique             | 🟡       | Moyen   |
| L5 | WebSocket télécommande         | 🟡       | Grand   |
| L6 | Statistiques d'utilisation     | 🟡       | Grand   |
| L7 | Notes opérateur en régie       | 🟡       | Petit   |
| S1 | isPathInDir dans plans:addItem | —        | Petit   |
| S2 | Validation backgroundConfig    | —        | Petit   |
