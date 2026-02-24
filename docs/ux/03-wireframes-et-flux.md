# Church Presenter — Wireframes & Flux d'interaction

> Document UX — Architecture de navigation, wireframes annotés, flux principaux
> Version 1.0 — Février 2026
> Les wireframes sont en ASCII pour l'indépendance aux outils. À compléter avec Figma.

---

## 1. Architecture de navigation

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CHURCH PRESENTER                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────┐                                   │
│  │        MODE PRÉPARATION          │                                   │
│  │  ┌────────────┐ ┌─────────────┐  │                                   │
│  │  │  Dashboard │ │  Plan Edit  │  │                                   │
│  │  └────────────┘ └─────────────┘  │                                   │
│  │  ┌────────────┐ ┌─────────────┐  │                                   │
│  │  │ Biblio.    │ │  Éditeur    │  │                                   │
│  │  │  Chants    │ │   Chant     │  │                                   │
│  │  └────────────┘ └─────────────┘  │                                   │
│  │  ┌────────────────────────────┐  │                                   │
│  │  │       Paramètres           │  │                                   │
│  │  │  (Raccourcis, Écrans,      │  │                                   │
│  │  │   Apparence, Import/Export)│  │                                   │
│  │  └────────────────────────────┘  │                                   │
│  └──────────────────────────────────┘                                   │
│                    │ Ctrl+P / bouton DIRECT                             │
│                    ▼                                                    │
│  ┌──────────────────────────────────┐                                   │
│  │         MODE DIRECT (LIVE)       │                                   │
│  │  Aperçu courant + suivant        │                                   │
│  │  Plan de navigation              │                                   │
│  │  Contrôles écrans A/B/C          │                                   │
│  └──────────────────────────────────┘                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Règles de navigation
- La navigation principale se fait via la barre de titre (toujours visible)
- Le panneau latéral sources (Chants, Bible, Annonces, Médias, Timer) est accessible depuis le Plan
- Les panneaux sources sont collapsibles
- Les Paramètres sont une page modale / panneau latéral droit
- Le mode Direct est une vue plein-écran qui recouvre tout (sauf la taskbar système)

---

## 2. Barre de titre (Header global)

Présente dans les deux modes. Contenu adaptatif selon le contexte.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ◉ Church Presenter     [Culte 23 Fév ▼]     [⚙] [?]     [▶ DIRECT]       │
│  logo + nom app          plan actif (dropdown)  params aide   bouton live   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Comportement du dropdown de plan :**
```
  [Culte 23 Fév ▼]
  ┌──────────────────────────────────────┐
  │  ● Culte 23 Fév 2026  ← aujourd'hui │
  │    Culte 16 Fév 2026                 │
  │    Culte 09 Fév 2026                 │
  │    Culte 02 Fév 2026                 │
  │  ──────────────────────────────────  │
  │  + Nouveau plan                      │
  └──────────────────────────────────────┘
```

**Barre de titre en Mode Direct :**
```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ● DIRECT   Culte 23 Fév    [⬛ NOIR] [⬜ BLANC] [R Reprendre]   [✕ Quitter]│
│  pulsant    plan actif        ctrls écran                        sortir live │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Écran : Mode Préparation (vue principale)

Vue quotidienne de Sophie et Marc. Deux colonnes : sources à gauche, plan au centre/droite.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ◉ Church Presenter     [Culte 23 Fév ▼]     [⚙] [?]     [▶ DIRECT]       │
├──────────────────────┬──────────────────────────────────────────────────────┤
│                      │                                                      │
│  SOURCES             │  DÉROULÉ — Culte du Dimanche 23 Février              │
│  ──────────────────  │  ──────────────────────────────────────────────────  │
│  [🎵 Chants    ▼]    │                                                      │
│  [📖 Bible     ▼]    │  ⠿  🟣 CHANT    Blessed be Your Name        [✎][✕] │
│  [📢 Annonces  ▶]    │       Hillsong ∙ Couplet 1 · Refrain · Pont         │
│  [🖼  Médias   ▶]    │                                                      │
│  [⏱  Minuterie ▶]   │  ⠿  🔵 BIBLE    Jean 3:16-18 (LSG)          [✎][✕] │
│                      │       « Car Dieu a tant aimé le monde... »           │
│  ─ Chants ─────────  │                                                      │
│                      │  ⠿  🟣 CHANT    Saint, Saint, Saint          [✎][✕] │
│  🔍 Rechercher...    │       Traditionnel ∙ Refrain · Couplet 1             │
│                      │                                                      │
│  ► Tu es saint       │  ⠿  🟡 ANNONCE  Réunion de prière lundi     [✎][✕] │
│  ► Blessed be your   │       « Rdv lundi 19h en salle annexe »              │
│  ► Saint saint saint │                                                      │
│  ► La grâce de Dieu  │  ⠿  🟣 CHANT    Grand est l'Éternel          [✎][✕] │
│                      │       Traditionnel ∙ Couplet 1 · Refrain             │
│  [+ Ajouter chant]   │                                                      │
│                      │  ⠿  🔴 TIMER    Pause 5 minutes              [✎][✕] │
│                      │                                                      │
│                      │                                                      │
│                      │  ┌──────────────────────────────────────────────┐   │
│                      │  │           +  Ajouter un élément              │   │
│                      │  └──────────────────────────────────────────────┘   │
│                      │                                                      │
│                      │  ─────────────────────────────────────────────────  │
│                      │  6 éléments · Durée estimée : ~45 min               │
│                      │                                                      │
└──────────────────────┴──────────────────────────────────────────────────────┘
```

**Annotations :**
- Panneau sources : largeur fixe 280px, collapsible (icône ◀/▶)
- Plan : scrollable, zone de drop active pour le drag depuis les sources
- Chaque item : fond blanc, bordure gauche colorée par type (🟣 violet chant, 🔵 bleu bible, 🟡 ambre annonce, 🔴 rouge timer)
- Les sous-titres (artiste, extrait de texte) apparaissent en muted, en italique
- Le bouton « + Ajouter un élément » ouvre un menu de sélection de type

**Panneau sources expandé — Chants :**
```
│  ─ Chants ─────────────────────────── [↑ Réduire]   │
│                                                      │
│  🔍 Rechercher par titre, artiste, paroles...        │
│                                                      │
│  Tu es saint                                         │
│    Hillsong ∙ 3 blocs                          [+]  │
│                                                      │
│  Blessed be Your Name                                │
│    Matt Redman ∙ 4 blocs                       [+]  │
│    ↳ « …every road that leads me... »                │
│      (paroles correspondantes surlignées)            │
│                                                      │
│  Saint, Saint, Saint                                 │
│    Traditionnel ∙ 2 blocs                      [+]  │
```

Le [+] en bout de ligne ajoute immédiatement tous les blocs du chant au plan.
Un clic sur le titre expand les blocs individuels.

---

## 4. Écran : Mode Direct (Live Control)

Vue de Marc pendant le service. Interface sombre, focus sur le contenu et la navigation.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ● DIRECT   Culte 23 Fév    [⬛ NOIR] [⬜ BLANC] [↺ Reprendre]   [✕ Quitter]│
├──────────────────────────────────────────┬──────────────────────────────────┤
│                                          │                                  │
│  ┌──────────────────────────────────┐    │  SUIVANT                        │
│  │                                  │    │  ────────────────────────────   │
│  │                                  │    │  📖 Jean 3:16 — LSG             │
│  │   3:16  Car Dieu a tant aimé     │    │                                  │
│  │         le monde qu'il a donné   │    │  ┌──────────────────────────┐   │
│  │         son Fils unique, afin    │    │  │ Car Dieu a tant aimé le  │   │
│  │         que quiconque croit en   │    │  │ monde qu'il a donné son  │   │
│  │         lui ne périsse point,    │    │  │ Fils unique, afin que... │   │
│  │         mais qu'il ait la vie    │    │  └──────────────────────────┘   │
│  │         éternelle.               │    │                                  │
│  │                                  │    ├──────────────────────────────────┤
│  │         Jean 3:16 — LSG          │    │                                  │
│  │                                  │    │  PLAN  3 / 8          ████░░░░  │
│  └──────────────────────────────────┘    │  ────────────────────────────   │
│                                          │  ✓  Blessed be Your Name        │
│  🎵 Blessed be Your Name · Refrain       │  ✓  Blessed be Your Name        │
│                                          │  ●  📖 Jean 3:16  ← EN COURS   │
│  ─────────────────────────────────────   │     📖 Jean 3:17                │
│                                          │     📖 Jean 3:18                │
│  ┌───────────────┐  ┌───────────────┐    │     🎵 Saint, Saint, Saint      │
│  │               │  │               │    │     🟡 Réunion de prière        │
│  │  ◀  PRÉC      │  │    SUIV  ▶   │    │     ⏱ Pause 5 min              │
│  │               │  │               │    │                                  │
│  └───────────────┘  └───────────────┘    │  ÉCRANS                        │
│    Ctrl+← / Q         Ctrl+→/ Espace     │  ────────────────────────────   │
│                                          │  [● A]  [○ B]  [○ C]           │
│  ─────────────────────────────────────   │  actif  veille veille           │
│  ⏱ 00:12:34  depuis le début du direct  │                                  │
└──────────────────────────────────────────┴──────────────────────────────────┘
```

**Annotations clés :**

1. **Zone COURANT (gauche, ~60%)** :
   - Fond `--current-slide` (indigo très sombre)
   - Texte blanc, taille police +2 niveaux par rapport à l'UI
   - Rendu réel : la même mise en forme que l'écran de projection
   - Titre de l'élément en muted au-dessus
   - Les boutons ◀/▶ sont larges (≥ 200px), hauteur 56px, très accessibles à la souris

2. **Zone SUIVANT (droite haut, ~40%)** :
   - Fond plus sombre, opacité 70%
   - Aperçu compact mais lisible
   - Titre de l'élément visible

3. **Plan de navigation (droite milieu)** :
   - Liste scrollable compacte
   - ✓ = projeté, ● = courant, espace = à venir
   - Clic direct sur n'importe quel item → projection immédiate
   - Auto-scroll pour garder l'item courant visible

4. **Sélecteur d'écrans (droite bas)** :
   - Pillules A/B/C avec état (● actif, ○ veille, 🔒 verrouillé)
   - Raccourcis 1/2/3

**État NOIR :**
```
│  ┌──────────────────────────────────┐    │
│  │                                  │    │
│  │  ████████████████████████████    │    │
│  │  ████████  ÉCRAN NOIR  ████████  │    │
│  │  ████████████████████████████    │    │
│  │                                  │    │
│  └──────────────────────────────────┘    │
│                                          │
│  La projection est suspendue             │
│  Appuyez sur [R] pour reprendre          │
```

---

## 5. Panneau : Recherche Bible (source panel expandé)

```
┌──────────────────────────────────────┐
│  📖 BIBLE                  [↑ Réduire]│
│  ──────────────────────────────────  │
│                                      │
│  Traduction : [LSG 1910 (hors-ligne)▼]│
│                                      │
│  🔍  Jean 3:16               [✕]     │
│      ou recherche textuelle          │
│                                      │
│  Livre : [Jean              ▼]       │
│                                      │
│  Chapitres (21 chapitres) :          │
│  ┌──────────────────────────────┐    │
│  │ [1][2][3][4][5][6][7]        │    │
│  │ [8][9][10][11][12][13][14]   │    │
│  │ [15][16][17][18][19][20][21] │    │
│  └──────────────────────────────┘    │
│   3 rangées max → scroll si +        │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  Jean 3 · Tout décocher              │
│                                      │
│  □  14  Et comme Moïse a élevé...    │
│  □  15  afin que quiconque croit...  │
│  ■  16  Car Dieu a tant aimé le...   │  ← sélectionné
│  ■  17  Car Dieu n'a pas envoyé...   │  ← sélectionné
│  □  18  Celui qui croit en lui...    │
│  □  19  Et c'est ici le jugement...  │
│                                      │
│  ─────────────────────────────────   │
│  Aperçu :                            │
│  ┌──────────────────────────────┐    │
│  │ 3:16 Car Dieu a tant aimé    │    │
│  │      le monde qu'il a donné  │    │
│  │      son Fils unique...      │    │
│  │ 3:17 Car Dieu n'a pas envoyé │    │
│  │      son Fils dans le monde  │    │
│  │      pour juger...           │    │
│  └──────────────────────────────┘    │
│                                      │
│  Mode : [Passage ●]  [Versets ○]     │
│                                      │
│  [+  Ajouter au plan]  [▶ Projeter] │
│                                      │
│  ✓ Jean 3:16-17 ajouté au plan       │
└──────────────────────────────────────┘
```

**Annotations :**
- La grille de chapitres est toujours bornée à 3 rangées de hauteur (≈ 80px), défilement interne si plus de 21 chapitres
- Les versets sélectionnés ont un fond `--primary/15` et une couleur de texte `--primary`
- L'aperçu est le rendu exact du slide (même police, même mise en forme que la projection)
- Le message de confirmation (✓) est dans une zone dédiée, pas un toast qui masque le contenu
- Le sélecteur Passage/Versets est mémorisé entre sessions

---

## 6. Écran : Bibliothèque de chants

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ◉ Church Presenter     [Culte 23 Fév ▼]     [⚙] [?]     [▶ DIRECT]       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  BIBLIOTHÈQUE DE CHANTS                                [+ Nouveau chant]   │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  🔍  Rechercher par titre, artiste ou paroles...     [Importer Word/JSON]  │
│                                                                             │
│  Filtres : [Tous ●] [Favoris] [Récents] [Utilisés ce mois]                 │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│                                                                             │
│  ♡  Blessed be Your Name                          Matt Redman  4 blocs [+] │
│     Utilisé 8 fois ∙ Dernière fois : 16 Fév                                │
│                                                                             │
│  ♥  Grand est l'Éternel                           Traditionnel 3 blocs [+] │
│     Utilisé 12 fois ∙ Dernière fois : 23 Fév (aujourd'hui)                 │
│                                                                             │
│  ♡  Jésus, tu es là                               Hillsong     2 blocs [+] │
│     Utilisé 3 fois ∙ Dernière fois : 09 Fév                                │
│                                                                             │
│  ♡  Saint, Saint, Saint                           Traditionnel 2 blocs [+] │
│     Utilisé 6 fois ∙ Dernière fois : 02 Fév                                │
│                                                                             │
│  ♡  Tu es digne                                   Hillsong     3 blocs [+] │
│     ∙ Jamais utilisé                                                        │
│                                                                             │
│  ─────────────────────────────────────────────────────────────────────────  │
│  45 chants dans la bibliothèque                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Clic sur un chant → expand inline :**
```
│  ♥  Grand est l'Éternel                           Traditionnel 3 blocs [+] │
│  ▼  ─────────────────────────────────────────────────────────────────────  │
│     ┌────────────────────────────────────────────────────────────────────┐ │
│     │ [COUPLET 1]  Grand est l'Éternel, grande est...              [+][▶]│ │
│     │ [REFRAIN  ]  Grand est l'Éternel, et très...                 [+][▶]│ │
│     │ [COUPLET 2]  Chante au Seigneur un cantique...               [+][▶]│ │
│     └────────────────────────────────────────────────────────────────────┘ │
│     [Éditer ce chant]  [Exporter Word]  [Tout ajouter au plan]             │
```

---

## 7. Écran : Éditeur de chant

Vue plein-écran (ou panneau largi) pour créer/éditer un chant.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Retour à la bibliothèque    ÉDITEUR — Grand est l'Éternel    [Enregistré]│
├──────────────────────────────────────────┬──────────────────────────────────┤
│  MÉTADONNÉES                             │                                  │
│  ────────────────────────────────────    │  APERÇU SLIDE                   │
│  Titre :   [Grand est l'Éternel    ]     │  ────────────────────────────   │
│  Artiste : [Traditionnel           ]     │                                  │
│  Album :   [                       ]     │  ┌──────────────────────────┐   │
│  Année :   [     ]  Tonalité : [G  ]     │  │                          │   │
│                                          │  │  Grand est l'Éternel,    │   │
│  BLOCS                                   │  │  grande est sa puissance,│   │
│  ────────────────────────────────────    │  │  grande est sa sagesse,  │   │
│                                          │  │  infinie sa bonté.       │   │
│  ⠿ [COUPLET 1]  Grand est l'Éternel...  │  │                          │   │
│    [édition inline ici] ───────────────  │  └──────────────────────────┘   │
│                                          │                                  │
│    Grand est l'Éternel,                  │  ← Aperçu du bloc sélectionné   │
│    grande est sa puissance,              │                                  │
│    grande est sa sagesse,                │  ────────────────────────────   │
│    infinie sa bonté.                     │  Police : [Inter    ▼]  [18px▼] │
│                           [Supprimer ✕]  │  Alignement : [◀ | ▶]          │
│                                          │                                  │
│  ─────────────────────────────────────   │                                  │
│                                          │                                  │
│  ⠿ [REFRAIN]    Grand est l'Éternel,... │                                  │
│                                          │                                  │
│  ⠿ [COUPLET 2]  Chante au Seigneur...   │                                  │
│                                          │                                  │
│  ─────────────────────────────────────   │                                  │
│  [+ Ajouter un bloc]                     │                                  │
│   Couplet / Refrain / Pont / Intro / Tag │                                  │
└──────────────────────────────────────────┴──────────────────────────────────┘
```

**Annotations :**
- L'éditeur est divisé en deux colonnes : blocs (gauche) + aperçu slide (droite)
- L'aperçu se met à jour en temps réel à chaque frappe
- Les blocs sont réordonnables par drag & drop (poignée ⠿)
- « Enregistré » apparaît dans l'en-tête après chaque sauvegarde auto (3s après la dernière frappe)
- Shift+Entrée crée un saut de ligne dans le bloc (sans créer un nouveau bloc)

---

## 8. Écran : Paramètres

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ← Retour                           PARAMÈTRES                             │
├──────────────────┬──────────────────────────────────────────────────────────┤
│                  │                                                          │
│  ○ Raccourcis    │  RACCOURCIS CLAVIER                                      │
│  ● Écrans        │  ────────────────────────────────────────────────────    │
│  ○ Apparence     │                                                          │
│  ○ Import/Export │  Action               Touche(s)          [Modifier]      │
│  ○ À propos      │  ────────────────── ──────────────── ────────────────    │
│                  │  Élément suivant      → Espace D                         │
│                  │  Élément précédent    ← Q                                │
│                  │  Écran A              1                                  │
│                  │  Écran B              2                                  │
│                  │  Écran C              3                                  │
│                  │  Écran noir           B                                  │
│                  │  Écran blanc          W                                  │
│                  │  Reprendre            R                                  │
│                  │  Mode Direct          Ctrl+P                             │
│                  │  Texte libre          Ctrl+T                             │
│                  │  Aide raccourcis      ?                                  │
│                  │                                                          │
│                  │  [Réinitialiser tous les raccourcis]                     │
│                  │                                                          │
│                  │  ────────────────────────────────────────────────────    │
│                  │                                                          │
│                  │  ÉCRANS DE PROJECTION                                    │
│                  │  ────────────────────────────────────────────────────    │
│                  │                                                          │
│                  │  Écran A  [Moniteur 2 — HDMI (1920×1080) ▼]  [Tester]   │
│                  │  Écran B  [Fenêtre flottante              ▼]  [Tester]   │
│                  │  Écran C  [Désactivé                      ▼]             │
│                  │                                                          │
│                  │  Écran B est : [Indépendant ▼]  (ou Miroir de A)        │
│                  │                                                          │
└──────────────────┴──────────────────────────────────────────────────────────┘
```

---

## 9. Overlay : Aide raccourcis (touche ?)

```
┌────────────────────────────────────────────────────────────────────────────┐
│                                                            [✕ Fermer / Esc] │
│                                                                             │
│           ⌨  RACCOURCIS CLAVIER — Church Presenter                         │
│                                                                             │
│  ──────────── NAVIGATION (Mode Direct) ──────────────────────────────────  │
│                                                                             │
│   ESPACE  D  →    Élément suivant           Q  ←    Élément précédent      │
│   R              Reprendre (annuler noir/blanc)                             │
│                                                                             │
│  ────────────── ÉCRANS ──────────────────────────────────────────────────  │
│                                                                             │
│   1              Sélectionner écran A       B        Écran noir             │
│   2              Sélectionner écran B       W        Écran blanc            │
│   3              Sélectionner écran C                                       │
│                                                                             │
│  ────────────── APPLICATION ─────────────────────────────────────────────  │
│                                                                             │
│   Ctrl+P         Basculer Mode Direct       Ctrl+T   Texte libre           │
│   Ctrl+Z         Annuler                    ?        Cette aide             │
│   Ctrl+F         Rechercher (sources)       Esc      Fermer / Annuler      │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────── │
│                    Raccourcis personnalisables dans ⚙ Paramètres           │
│                                                                             │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 10. Flux d'interaction : Dimanche matin typique

```
Marc arrive en régie (9h30)
    │
    ▼
Ouvre l'app → Plan du jour automatiquement sélectionné
    │
    ├── Vérifie les éléments du plan (scroll rapide)
    │   └── Aperçu de chaque slide si besoin (clic sur l'item)
    │
    ├── Test de projection : bouton [▶ DIRECT] → projette l'intro
    │   └── Vérifie sur l'écran physique
    │
    ├── Ajuste si besoin (taille police, couleur)
    │   └── Paramètres > Apparence (2 clics)
    │
    └── Revient en mode Préparation, attend le début

Service commence (10h00)
    │
    ▼
Ctrl+P → Mode Direct activé
    │
    ├── Navigation : ESPACE à chaque couplet/verset
    │
    ├── Changement imprévu de chant
    │   ├── Ctrl+F → focus sur la recherche de sources
    │   ├── Tape 3 lettres du titre → résultat instantané
    │   ├── Clic sur le bloc voulu → drag vers le plan (ou +)
    │   └── Clic direct dans le plan pour projeter
    │
    ├── Pasteur finit plus tôt → écran noir
    │   └── Touche B → fond noir immédiat
    │
    └── Fin du service → Ctrl+P → quitter Direct

Après le service
    │
    └── Menu > Export → exporte le plan pour archives
```

---

## 11. Flux : Import d'un chant Word (Sophie, vendredi soir)

```
Bibliothèque > [Importer Word/JSON]
    │
    ▼
Sélecteur de fichier système → choisit "laudate_dominum.docx"
    │
    ▼
Analyse du fichier...
    │
    ├── Titre détecté : « Laudate Dominum »
    ├── 3 sections détectées : Couplet 1, Refrain, Couplet 2
    └── Aperçu de chaque section avec le texte extrait
    │
    ▼
Interface de validation :
┌─────────────────────────────────────────────────────────────┐
│  Import — Laudate Dominum                                   │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Titre : [Laudate Dominum           ]                       │
│  Artiste : [                        ]  (à compléter)        │
│                                                             │
│  Sections détectées :                                       │
│  [COUPLET 1 ▼]  Laudate, laudate, laudate Dominum...  [✎]  │
│  [REFRAIN  ▼]  Laudate Dominum, laudate Dominum...    [✎]  │
│  [COUPLET 2 ▼]  Omnis spiritus laudet Dominum...      [✎]  │
│                                                             │
│  [Ajouter une section]                                      │
│                                                             │
│  [Annuler]                        [✓ Enregistrer le chant] │
└─────────────────────────────────────────────────────────────┘
    │
    ▼
Chant sauvegardé → notification : « Laudate Dominum ajouté à la bibliothèque »
```

---

## 12. États vides et cas limites

### Plan vide (premier lancement)
```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│                    📋                                        │
│                                                              │
│         Votre plan est vide.                                 │
│                                                              │
│  Glissez des éléments depuis le panneau gauche              │
│  ou cliquez sur le bouton ci-dessous.                        │
│                                                              │
│         [+ Ajouter le premier élément]                       │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Aucun chant dans la bibliothèque
```
│                    🎵                                        │
│                                                              │
│         Aucun chant dans la bibliothèque.                   │
│                                                              │
│  [+ Créer un chant]    [↑ Importer Word]                    │
```

### Perte de connexion (traductions en ligne)
```
│  ⚠ Connexion indisponible                                    │
│  La traduction LSG est disponible hors-ligne.               │
│  [Utiliser LSG hors-ligne]                                   │
```

### Écran de projection déconnecté
```
│  ÉCRANS  [● A]  [✕ B]  [○ C]                                │
│                  ↑                                           │
│                  Écran B déconnecté                          │
│                  [Reconnecter]                               │
```

---

## 13. Responsive et adaptabilité

L'application est desktop-first mais la fenêtre doit être redimensionnable :

| Largeur fenêtre | Comportement |
|---|---|
| < 900px | Panneau sources auto-collapse, plan prend toute la largeur |
| 900–1200px | Panneau sources 240px, plan le reste |
| > 1200px | Panneau sources 280px, plan le reste, éventuellement aperçu inline |
| Mode Direct < 1000px | Panneau plan (droite) collapse en slide-over au besoin |

**Le mode Direct ne doit JAMAIS être inutilisable** quelle que soit la taille de fenêtre.
Priorité d'affichage en mode Direct si l'espace est contraint :
1. Zone COURANT (toujours visible)
2. Boutons ◀/▶ (toujours visibles)
3. Contrôles NOIR/BLANC (toujours visibles)
4. Zone SUIVANT (peut se réduire)
5. Panneau PLAN (peut se masquer en slide-over)

---

## 14. Dialog : Ajouter un élément au plan

Déclenché par le bouton « + Ajouter un élément » en bas du plan ou par glisser-déposer raté.

```
┌─────────────────────────────────────────────────────────────┐
│  Ajouter un élément                              [✕ Fermer] │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Quel type d'élément veux-tu ajouter ?                      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │              │  │              │  │              │      │
│  │  🟣 🎵       │  │  🔵 📖       │  │  🟡 📢       │      │
│  │   Chant      │  │   Bible      │  │  Annonce     │      │
│  │              │  │              │  │   texte      │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │              │  │              │  │              │      │
│  │  🟣 🖼        │  │  🟣 📄       │  │  🔴 ⏱       │      │
│  │  Annonce     │  │   PDF        │  │  Minuterie   │      │
│  │   image      │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐                                          │
│  │              │                                          │
│  │  📝 Verset   │                                          │
│  │   manuel     │                                          │
│  │              │                                          │
│  └──────────────┘                                          │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Ou glisse un élément depuis le panneau de sources.         │
└─────────────────────────────────────────────────────────────┘
```

**Comportement selon le type sélectionné :**

- **Chant** → ouvre le panneau sources > onglet Chants (focus sur la recherche)
- **Bible** → ouvre le panneau sources > onglet Bible (focus sur le champ de référence)
- **Annonce texte** → ajoute directement un item vide de type ANNOUNCEMENT_TEXT + mode édition inline
- **Annonce image / PDF** → ouvre le sélecteur de fichier système
- **Minuterie** → ouvre le mini-formulaire de configuration (voir § 15)
- **Verset manuel** → ajoute un item VERSE_MANUAL vide + mode édition inline

---

## 15. Dialog : Configuration de la minuterie

```
┌─────────────────────────────────────────────────────────────┐
│  Ajouter une minuterie                           [✕ Fermer] │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Durée :                                                    │
│                                                             │
│      ┌──────┐  :  ┌──────┐                                  │
│      │  05  │     │  00  │                                  │
│      └──────┘     └──────┘                                  │
│       minutes      secondes                                  │
│                                                             │
│  Raccourcis :  [+1 min]  [+5 min]  [+10 min]                │
│                                                             │
│  Titre (optionnel) :                                        │
│  [Pause                                        ]            │
│                                                             │
│  Options :                                                  │
│  ☑ Afficher l'alerte visuelle à 0:00                        │
│  ☐ Boucler automatiquement                                   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                     [Annuler]  [✓ Ajouter au plan]          │
└─────────────────────────────────────────────────────────────┘
```

**Minuterie en mode Direct :**

```
┌─────────────────────────────────────────────────────────────┐
│  ● DIRECT   Culte 23 Fév    [⬛ NOIR] [⬜ BLANC]  [✕ Quitter]│
├──────────────────────────────────────┬──────────────────────┤
│                                      │                      │
│  ┌──────────────────────────────┐    │  SUIVANT             │
│  │                              │    │  ──────────────────  │
│  │                              │    │  🎵 Saint, Saint…    │
│  │         04:23                │    │                      │
│  │         ████████░░           │    │  ┌────────────────┐  │
│  │                              │    │  │  Aperçu...     │  │
│  │         Pause                │    │  └────────────────┘  │
│  │                              │    │                      │
│  └──────────────────────────────┘    ├──────────────────────┤
│                                      │  PLAN  5 / 8         │
│  ⏱ Minuterie active                 │  ...                 │
│                                      │                      │
│  [▶▶ Pause]  [↺ Reset]  [⏭ Fin]     │  ÉCRANS              │
│                                      │  [● A] [○ B] [○ C]   │
└──────────────────────────────────────┴──────────────────────┘
```

**État alerte (0:00 atteint) :**
```
│  ┌──────────────────────────────┐    │
│  │  ████████████████████████    │    │
│  │  █        00:00            █  │    │  ← fond rouge pulsant
│  │  ████████████████████████    │    │
│  └──────────────────────────────┘    │
```

---

## 16. Popup : Texte libre (projection rapide)

Déclenché par `Ctrl+T` (en mode Direct ou Préparation).

```
┌─────────────────────────────────────────────────────────────┐
│  Texte libre                                     [✕ / Esc] │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │  Tape le texte à projeter…                          │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Projeter sur : [● A]  [○ B]  [○ C]                        │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  [Annuler]         [▶ Projeter maintenant]  [+ Ajouter]    │
│                                                Ajouter      │
│                                                au plan      │
└─────────────────────────────────────────────────────────────┘
```

**Annotations :**

- Le textarea prend le focus immédiatement à l'ouverture
- `Ctrl+Enter` déclenche « Projeter maintenant »
- `Escape` ferme sans projeter
- « Projeter maintenant » projette sans ajouter au plan (projection éphémère)
- « + Ajouter » crée un VERSE_MANUAL dans le plan ET projette

---

## 17. Panneau : Historique de session

Accessible via un bouton dans la barre de titre du mode Direct ou via menu contextuel.

```
┌────────────────────────────────────────────────────────┐
│  Historique de session                      [✕ Fermer] │
│  ─────────────────────────────────────────────────────  │
│                                                         │
│  Service du 23 Février 2026 — démarré à 10:02          │
│                                                         │
│  10:02  🎵 Blessed be Your Name      · Refrain  [▶]    │
│  10:03  🎵 Blessed be Your Name      · Couplet 1 [▶]   │
│  10:05  🔵 Jean 3:16                            [▶]    │
│  10:06  🔵 Jean 3:17                            [▶]    │
│  10:07  🔵 Jean 3:18                            [▶]    │
│  10:08  ⬛ ÉCRAN NOIR                                   │
│  10:09  🎵 Saint, Saint, Saint       · Couplet 1 [▶]   │
│  10:11  🟡 Réunion de prière                    [▶]    │
│  10:12  ⏱ Pause 5 min               · 04:51           │
│  ●  10:17  📖 En cours...                               │
│                                                         │
│  Durée totale du service : 00:15:23                     │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  [Effacer l'historique]              [Exporter CSV]     │
└────────────────────────────────────────────────────────┘
```

**Annotations :**

- Le [▶] permet de re-projeter un élément passé (pratique pour revenir en arrière)
- L'élément courant est marqué ●
- L'historique est en mémoire seulement (pas persisté entre sessions)

---

## 18. Panneau : Paramètres — Apparence

```
┌─────────────────────────────────────────────────────────────────────┐
│  ← Retour                              PARAMÈTRES — Apparence        │
├──────────────────┬──────────────────────────────────────────────────┤
│                  │                                                    │
│  ○ Raccourcis    │  APPARENCE DE LA PROJECTION                       │
│  ○ Écrans        │  ─────────────────────────────────────────────    │
│  ● Apparence     │                                                    │
│  ○ Import/Export │  Police du texte projeté :                        │
│  ○ À propos      │  [Inter           ▼]   [18px ▼]   [Gras □]       │
│                  │                                                    │
│                  │  Alignement :  [◀ Gauche]  [| Centré ●]  [▶ Droit]│
│                  │                                                    │
│                  │  Couleur du texte :                                │
│                  │  ┌───────┐  [#FFFFFF    ]  Opacité : [100%]       │
│                  │  │  ███  │                                         │
│                  │  └───────┘                                         │
│                  │                                                    │
│                  │  Couleur du fond :                                 │
│                  │  Type : [Couleur unie ●]  [Dégradé ○]  [Image ○]  │
│                  │  ┌───────┐  [#000000    ]  Opacité : [90%]        │
│                  │  │  ███  │                                         │
│                  │  └───────┘                                         │
│                  │                                                    │
│                  │  Logo (optionnel) :                                │
│                  │  ┌───────────────────────────────┐                │
│                  │  │  + Sélectionner une image...  │                │
│                  │  └───────────────────────────────┘                │
│                  │  Position : [Bas gauche ▼]  Taille : [80px]       │
│                  │                                                    │
│                  │  Bande inférieure (lower-third) :                 │
│                  │  ☐ Afficher la référence (ex. Jean 3:16)          │
│                  │  ☑ Afficher le titre du chant                     │
│                  │                                                    │
│                  │  ─────────────────────────────────────────────    │
│                  │                                                    │
│                  │  APERÇU EN TEMPS RÉEL                             │
│                  │  ┌──────────────────────────────────────────┐     │
│                  │  │                                          │     │
│                  │  │  Exemple de texte projeté               │     │
│                  │  │  sur plusieurs lignes pour               │     │
│                  │  │  vérifier la lisibilité.                 │     │
│                  │  │                                          │     │
│                  │  │  [TITRE DU CHANT]                        │     │
│                  │  └──────────────────────────────────────────┘     │
│                  │                                                    │
│                  │  [Réinitialiser l'apparence]    [Appliquer ✓]     │
│                  │                                                    │
└──────────────────┴────────────────────────────────────────────────────┘
```

---

## 19. Flux : Gestion d'une urgence en direct

Scénario : le pasteur change de chant en plein milieu du service.

```
Service en cours → Marc a le focus sur le mode Direct
    │
    ├── Pasteur annonce un chant non prévu
    │
    ▼
Marc appuie sur B → Écran noir (gagne 15 secondes)
    │
    ▼
Ctrl+F (ou clic dans la zone sources) → focus sur la recherche Chants
    │
    ▼
Tape 3 lettres → résultats filtrés en temps réel
    │
    ├── Trouve le chant → clic sur [+] → ajouté immédiatement au plan
    │   └── Clic sur l'item dans la liste du plan → projection
    │
    └── Chant introuvable → Ctrl+T → texte libre
        └── Tape les paroles manuellement → [▶ Projeter]

Tout le processus : < 10 secondes.
```

---

## 20. Flux : Import/Export de données (Sophie, migration)

```
Paramètres > Import/Export
    │
    ├── EXPORT
    │   ├── [Exporter tout] → ZIP contenant :
    │   │     songs.json (tous les chants)
    │   │     plans/*.json (tous les plans)
    │   │     media/* (tous les médias)
    │   └── Dialogue de sauvegarde → nomme le fichier → Enregistrer
    │
    └── IMPORT
        ├── [Importer] → sélecteur de fichier → choisit church-presenter-export.zip
        │
        ├── Analyse du fichier...
        │   ┌─────────────────────────────────────────────┐
        │   │  Contenu de l'archive :                     │
        │   │  • 45 chants                                │
        │   │  • 12 plans                                 │
        │   │  • 8 fichiers médias                        │
        │   │                                             │
        │   │  Mode d'import :                            │
        │   │  [● Fusionner]  [○ Remplacer tout]          │
        │   │                                             │
        │   │  FUSIONNER : ajoute sans supprimer          │
        │   │  REMPLACER : efface et recrée tout          │
        │   │                                             │
        │   │  [Annuler]          [Importer ✓]            │
        │   └─────────────────────────────────────────────┘
        │
        └── Import en cours... (barre de progression)
            └── Toast : « Import réussi — 45 chants, 12 plans. »
```

---

*Prochaine étape : Prototypage Figma à partir de ces wireframes.*
*Priorité : Mode Direct (US-070 à US-078) → Plan Edit (US-020 à US-026) → Bible panel (US-040 à US-044)*
