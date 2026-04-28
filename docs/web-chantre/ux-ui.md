# UX/UI — Application Web Chantre

Document de design et parcours utilisateurs pour les trois rôles de l'application.

---

## Principes de design

- **Mobile-first** : la majorité des chantres utilisent leur téléphone
- **Lisibilité avant tout** : les paroles doivent être lisibles d'un coup d'œil, même en répétition
- **Rapide à atteindre** : un chant doit être trouvable en 2 taps maximum depuis l'accueil
- **Cohérence visuelle** avec l'app desktop (Tailwind CSS v4, shadcn/ui, même palette de couleurs)
- **Sobre** : pas d'animations lourdes, pas de distractions — contexte de culte

---

## Structure de navigation

```
/                   → redirect vers /app ou /login selon session
/login              → page de connexion (tous les rôles)

/app                → tableau de bord (rôle-dépendant)
/app/songs          → bibliothèque de chants
/app/songs/[id]     → détail d'un chant
/app/songs/new      → nouveau chant (CHANTRE / ADMIN)
/app/songs/[id]/edit → modifier un chant (CHANTRE / ADMIN)
/app/plan           → plan du service du jour
/app/plan/[date]    → plan d'une date spécifique
/app/history        → historique des plans passés
/app/admin          → gestion des utilisateurs (ADMIN uniquement)
/app/admin/users    → liste des utilisateurs
/app/admin/users/new → créer un utilisateur
```

---

## Composants UI globaux

| Composant | Description |
|-----------|-------------|
| `BottomNav` | Barre de navigation fixe en bas sur mobile (4 icônes : Accueil, Chants, Plan, Profil) |
| `SideNav` | Navigation latérale sur desktop (même items) |
| `SearchBar` | Barre de recherche persistante sur `/app/songs` |
| `SongCard` | Carte compacte : titre, auteur, tonalité, badge statut apprentissage |
| `BlockViewer` | Affichage d'un bloc de chant avec label (Couplet 1, Refrain…) |
| `PlanItemRow` | Ligne dans le plan : icône kind, titre, durée estimée |
| `RoleBadge` | Badge coloré ADMIN / CHANTRE / LECTEUR |
| `EmptyState` | Illustration + message quand une liste est vide |

---

## Parcours LECTEUR

> Rôle : membre de l'église, accès lecture seule.

### PL-1 — Consulter le plan du service du jour

```
[Accueil] → [Plan du jour]
  - Affiche la date du prochain dimanche par défaut
  - Liste ordonnée des items : chants, annonces, versets
  - Tap sur un item chant → paroles en lecture seule
  - Bouton "Dimanches précédents" pour naviguer dans l'historique
```

**Écran Plan du jour**
- En-tête : date du service + nombre d'items
- Liste scrollable des items avec icône par kind
- Tap sur un chant → modale ou page de paroles (BlockViewer)
- Aucun bouton d'action (lecture seule)

---

### PL-2 — Rechercher et lire un chant

```
[Chants] → [Recherche] → [Résultats] → [Détail chant]
```

**Écran Bibliothèque**
- Barre de recherche en haut (focus automatique)
- Résultats en temps réel (debounce 300ms)
- Filtres : par première lettre (A–Z), par tag/tonalité
- Tap sur un chant → page détail

**Écran Détail chant (LECTEUR)**
- Titre + auteur + tonalité
- Blocs dans l'ordre : label + paroles
- Bouton "Mode lecture" → plein écran, texte agrandi, fond sombre

---

## Parcours CHANTRE

> Rôle : chantre désigné, peut lire et modifier les chants.
> Hérite de tous les parcours LECTEUR.

### PC-1 — Ajouter un nouveau chant

```
[Chants] → [+ Nouveau chant] → [Formulaire] → [Enregistrer] → [Détail chant]
```

**Écran Nouveau chant**
- Champs : Titre*, Auteur, Tonalité, Tags (optionnels)
- Section blocs :
  - Bouton "+ Ajouter un bloc"
  - Chaque bloc : sélecteur de type (Couplet, Refrain, Pont, Intro, Outro, Verset), zone de texte
  - Drag & drop pour réordonner les blocs
  - Bouton supprimer par bloc
- Bouton "Enregistrer" → toast succès + redirect vers détail
- Bouton "Annuler" → confirmation si des champs sont remplis

**Validation**
- Titre obligatoire
- Au moins un bloc requis
- Confirmation avant de quitter si modifications non sauvegardées

---

### PC-2 — Modifier un chant existant

```
[Détail chant] → [Modifier] → [Formulaire pré-rempli] → [Enregistrer]
```

- Même formulaire que la création, pré-rempli
- Historique des modifications non affiché (pas de versioning v1)
- Toast de confirmation après sauvegarde

---

### PC-3 — Importer des chants

```
[Chants] → [Importer] → [Sélection fichier] → [Aperçu] → [Confirmer]
```

- Formats acceptés : `.txt`, `.docx`
- Étape aperçu : liste des chants détectés avec titre et nombre de blocs
- Option : ignorer les doublons (même titre) ou écraser
- Résumé après import : X chants importés, Y ignorés

---

### PC-4 — Marquer un chant comme favori

```
[Détail chant] → [Icône cœur] → [Favori ajouté]
```

- Cœur vide → cœur plein (toggle)
- Toast discret "Ajouté aux favoris"
- Accessible depuis la liste : cœur sur la SongCard

**Écran Favoris**
- Accessible depuis l'accueil ou le profil
- Même liste que Bibliothèque, filtrée sur les favoris de l'utilisateur connecté

---

### PC-5 — Suivre son apprentissage

```
[Détail chant] → [Statut] → [Sélecteur : À apprendre / En cours / Maîtrisé]
```

- Badge coloré sur la SongCard selon le statut :
  - `À apprendre` → gris
  - `En cours` → orange
  - `Maîtrisé` → vert
- Filtre dans la bibliothèque : afficher uniquement "À apprendre", etc.

---

### PC-6 — Annoter un bloc

```
[Détail chant] → [Tap sur un bloc] → [Icône note] → [Saisie note] → [Enregistrer]
```

- Note visible uniquement par l'auteur
- Affichée sous le bloc concerné en italic, couleur atténuée
- Tap sur la note → modifier ou supprimer

---

### PC-7 — Mode lecture (répétition)

```
[Détail chant] → [Mode lecture]
```

- Plein écran
- Fond sombre, texte blanc, police large
- Blocs navigables avec swipe gauche/droite ou flèches
- Label du bloc affiché en haut (ex: "Refrain")
- Tap n'importe où → quitter le mode lecture

---

## Parcours ADMIN

> Rôle : administrateur, accès complet.
> Hérite de tous les parcours CHANTRE.

### PA-1 — Créer un utilisateur

```
[Admin] → [Utilisateurs] → [+ Nouvel utilisateur] → [Formulaire] → [Enregistrer]
```

**Formulaire**
- Nom complet*, Email*, Rôle* (CHANTRE ou LECTEUR par défaut)
- Mot de passe temporaire généré automatiquement (affiché une seule fois)
- Option "Envoyer par email" (v2)

---

### PA-2 — Gérer les utilisateurs

```
[Admin] → [Utilisateurs] → [Liste] → [Actions par utilisateur]
```

**Écran liste utilisateurs**
- Tableau : Nom, Email, Rôle, Date création, Dernière connexion
- Actions : Modifier le rôle, Réinitialiser le mot de passe, Désactiver / Supprimer
- Confirmation avant suppression (ConfirmDialog)

---

### PA-3 — Supprimer un chant

```
[Détail chant] → [Menu ···] → [Supprimer] → [ConfirmDialog] → [Redirect bibliothèque]
```

- Bouton supprimer visible uniquement pour ADMIN
- Dialog de confirmation avec nom du chant
- Toast "Chant supprimé" après confirmation

---

## États d'interface

| État | Traitement |
|------|------------|
| Chargement | Skeleton loader (pas de spinner global) |
| Liste vide | EmptyState avec illustration et call-to-action contextuel |
| Erreur réseau | Toast erreur + bouton "Réessayer" |
| Non autorisé | Redirect `/login` ou page 403 selon le cas |
| Formulaire invalide | Erreurs inline sous chaque champ, bouton submit désactivé |
| Action destructive | ConfirmDialog systématique |

---

## Wireframes textuels — écrans clés

### Écran Login

```
┌─────────────────────────────────┐
│                                 │
│        [Logo / Nom app]         │
│                                 │
│  ┌─────────────────────────┐    │
│  │  Email                  │    │
│  └─────────────────────────┘    │
│  ┌─────────────────────────┐    │
│  │  Mot de passe      [👁] │    │
│  └─────────────────────────┘    │
│                                 │
│  [     Se connecter      ]      │
│                                 │
│  Message d'erreur si échec      │
│                                 │
└─────────────────────────────────┘
```

---

### Écran Bibliothèque — mobile

```
┌─────────────────────────────────┐
│  Chants             [+ Nouveau] │  ← TopBar (CHANTRE/ADMIN seulement)
├─────────────────────────────────┤
│  🔍 Rechercher...               │  ← SearchBar sticky
├─────────────────────────────────┤
│  A  B  C  D … Tous              │  ← filtre lettres (scrollable horizontal)
├─────────────────────────────────┤
│                                 │
│  ┌─────────────────────────┐    │
│  │ Amazing Grace        ♡  │    │  ← SongCard
│  │ John Newton · Sol        │    │
│  │ ● Maîtrisé              │    │
│  └─────────────────────────┘    │
│                                 │
│  ┌─────────────────────────┐    │
│  │ 10 000 Reasons       ♡  │    │
│  │ Matt Redman · Ré         │    │
│  │ ○ À apprendre           │    │
│  └─────────────────────────┘    │
│                                 │
│  … (scroll infini ou pagination)│
│                                 │
├─────────────────────────────────┤
│  🏠 Accueil  🎵 Chants  📋 Plan  👤 │  ← BottomNav
└─────────────────────────────────┘
```

---

### Écran Détail chant — mobile (CHANTRE)

```
┌─────────────────────────────────┐
│  ←  Amazing Grace         [···] │  ← TopBar ; [···] = menu (Modifier, Supprimer ADMIN)
├─────────────────────────────────┤
│                                 │
│  Amazing Grace                  │  ← titre
│  John Newton · Sol              │  ← auteur · tonalité
│  ♡  Favori    ● Maîtrisé  [📖] │  ← actions + mode lecture
│                                 │
├─────────────────────────────────┤
│  Couplet 1                      │  ← label
│                                 │
│  Amazing grace, how sweet       │
│  the sound…                     │
│                                 │
│  📝 Ma note : reprendre 2x      │  ← note personnelle (si présente)
│                                 │
├─────────────────────────────────┤
│  Refrain                        │
│                                 │
│  My chains are gone,            │
│  I've been set free…            │
│                                 │
│  [+ Ajouter une note]           │  ← bouton discret
│                                 │
└─────────────────────────────────┘
```

---

### Écran Mode lecture — plein écran

```
┌─────────────────────────────────┐  ← fond noir
│                            [✕]  │  ← quitter
│                                 │
│         REFRAIN                 │  ← label en haut, atténué
│                                 │
│                                 │
│      My chains are gone,        │
│      I've been set free,        │
│      My God, my Savior          │
│      has ransomed me.           │
│                                 │
│                                 │
│   ←   2 / 4   →                 │  ← navigation blocs
└─────────────────────────────────┘
```

---

### Écran Plan du jour — mobile

```
┌─────────────────────────────────┐
│  Plan du service                │
│  Dimanche 27 avril 2026         │
├─────────────────────────────────┤
│  ← Sem. précédente  Suiv. →     │  ← navigation entre dimanches
├─────────────────────────────────┤
│                                 │
│  1.  🎵  Amazing Grace          │  ← icône kind + titre
│  2.  🎵  10 000 Reasons         │
│  3.  📖  Jean 3:16              │
│  4.  📢  Annonce : collecte     │
│  5.  🎵  Great is Thy Faithf…   │
│                                 │
│  ─────  Durée estimée : 45 min  │
│                                 │
└─────────────────────────────────┘
```

---

### Écran Admin — liste utilisateurs

```
┌─────────────────────────────────┐
│  Utilisateurs      [+ Nouveau]  │
├─────────────────────────────────┤
│  Nom          Rôle    Statut    │
│  ──────────────────────────────│
│  Jean Dupont  ADMIN   Actif  ⋯ │
│  Marie L.     CHANTRE Actif  ⋯ │
│  Pierre M.    CHANTRE Actif  ⋯ │
│  Sophie B.    LECTEUR Actif  ⋯ │
│                                 │
│  [⋯] → Modifier rôle           │
│        Réinitialiser MDP        │
│        Désactiver               │
│        Supprimer                │
└─────────────────────────────────┘
```

---

## Responsive

| Breakpoint | Comportement |
|------------|-------------|
| Mobile (`< 768px`) | BottomNav, une colonne, blocs en pleine largeur |
| Tablette (`768–1024px`) | BottomNav ou SideNav rétractable, 2 colonnes sur la bibliothèque |
| Desktop (`> 1024px`) | SideNav fixe, 3 colonnes sur la bibliothèque, détail en panneau latéral |
