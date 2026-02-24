# Church Presenter — Vision UX & Principes de Design

> Document UX — Vision, Personas, Parcours, Système de Design
> Version 1.0 — Février 2026

---

## 1. Vision du produit

**Church Presenter** est l'outil de confiance des équipes techniques d'église.
Il doit disparaître derrière le service : quand tout se passe bien, l'opérateur ne pense pas à l'application, il pense au service.

### Le problème central

Le dimanche matin à 10h02, le pasteur annonce un chant qui n'était pas dans le plan.
L'opérateur a 15 secondes pour trouver le bon chant, l'ouvrir, aller au bon couplet et projeter — le tout sans que la congrégation ne se rende compte de rien.

**L'application doit rendre ce scénario trivial.**

### Proposition de valeur

| Besoin | Réponse |
|---|---|
| Fiabilité le dimanche matin | Interface lisible, actions non-destructives, zéro configuration requise en live |
| Préparation efficace la semaine | Glisser-déposer, recherche instantanée, import Word/JSON |
| Aucune dépendance réseau | Bible complète embarquée, tout en local |
| Trois écrans indépendants | Contrôle granulaire A/B/C avec miroir configurable |

---

## 2. Personas

### Persona 1 — Marc, 28 ans : « Le Technicien »

**Rôle** : Opérateur son/lumière/projection, présent chaque dimanche
**Contexte** : Régie technique, souvent dans le noir, parfois debout, toujours multitâche
**Niveau tech** : Avancé — connaît les raccourcis, veut la puissance sans la complexité

**Besoins :**
- Savoir en un coup d'œil ce qui est projeté et ce qui suit
- Naviguer au clavier sans quitter les yeux de la scène
- Réagir en 5 secondes à un changement de dernière minute

**Frustrations :**
- Les interfaces qui cachent les actions importantes derrière des menus
- Les confirmations intempestives qui bloquent en live
- Ne pas savoir si l'écran de projection a bien reçu la commande

**Citation :** *"Je veux juste appuyer sur espace et que ça marche."*

---

### Persona 2 — Sophie, 44 ans : « La Coordinatrice »

**Rôle** : Responsable des louanges, prépare le plan chaque semaine
**Contexte** : Bureau à domicile, le vendredi soir, avec ses listes de chants habituelles
**Niveau tech** : Intermédiaire — à l'aise avec les outils bureautiques, pas avec le code

**Besoins :**
- Construire le plan de service rapidement (30 min max)
- Retrouver ses chants favoris sans chercher
- Partager le plan avec l'équipe
- Corriger une erreur sans risquer de tout casser

**Frustrations :**
- Saisir les paroles de chant à la main à chaque fois
- Interfaces complexes avec trop d'options visibles à l'écran
- Ne pas avoir de retour visuel quand une action réussit

**Citation :** *"J'ai toujours les mêmes 50 chants. Je veux juste les glisser dans l'ordre."*

---

### Persona 3 — David, 51 ans : « Le Pasteur Autonome »

**Rôle** : Pasteur d'une petite église, gère seul la projection
**Contexte** : Utilise l'app depuis la chaire avec un ordinateur portable
**Niveau tech** : Débutant — utilise Word, les emails, c'est tout

**Besoins :**
- Interface évidente sans formation
- Boutons grands et clairs
- Revenir à l'écran noir en une touche si quelque chose se passe mal

**Frustrations :**
- Trop d'options qui créent la confusion
- Pas savoir si le public voit quelque chose ou non
- Les interfaces qui nécessitent des réglages préalables

**Citation :** *"Je veux appuyer sur un bouton et que le verset s'affiche. C'est tout."*

---

## 3. Parcours utilisateur principal

```
VENDREDI SOIR — Préparation
────────────────────────────────────────────────────────────────────────────
Sophie ouvre l'app → crée le plan du dimanche → cherche les chants →
les glisse dans l'ordre → ajoute les passages bibliques →
importe les annonces depuis Word → vérifie l'aperçu → ferme l'app

SAMEDI — Vérification
────────────────────────────────────────────────────────────────────────────
Marc ouvre le plan → vérifie chaque élément → corrige les paroles
si besoin → vérifie que les médias sont présents → note les variantes
possibles → ferme l'app

DIMANCHE 9H30 — Préparation technique
────────────────────────────────────────────────────────────────────────────
Marc ouvre l'app → vérifie la configuration des écrans →
fait un test de projection → ajuste la taille du texte si besoin →
passe en mode Live → attend le début du service

DIMANCHE 10H — Service en direct
────────────────────────────────────────────────────────────────────────────
Marc navigue au clavier → aperçu toujours visible →
un chant change → cherche en 5s → projette directement →
service terminé → ferme le mode Live
```

---

## 4. Principes de design

### P1 — Confiance avant tout
L'opérateur doit TOUJOURS savoir ce qui est affiché sur l'écran de projection.
Chaque action doit donner un retour visuel immédiat et non ambigu.
→ Indicateur d'état de projection visible en permanence en mode Live.

### P2 — Deux modes, deux cervelles
**Mode Préparation** (avant le service) : informationnel, contextuel, riche.
**Mode Direct** (pendant le service) : opérationnel, minimal, clavier-first.
Ces deux modes ont des interfaces distinctes et une transition consciente entre eux.

### P3 — L'action la plus fréquente doit être la plus facile
Navigation slide suivant/précédent = touche Espace / Flèches.
Écran noir = touche B.
Ces actions fonctionnent sans que l'opérateur n'ait à regarder le clavier.

### P4 — Zéro dialogue destructeur en live
Aucune confirmation modale pendant le mode Live (sauf suppression de plan).
Les actions destructrices sont réversibles (Ctrl+Z) ou protégées hors-live.

### P5 — Le contenu est roi
Les aperçus de slides montrent le **vrai contenu**, pas des titres.
L'opérateur voit la diapositive telle qu'elle apparaît sur l'écran de projection.

### P6 — Progressive disclosure
Fonctionnalités avancées (multi-écrans, apparence, synchronisation réseau) accessibles
depuis Paramètres ou via raccourcis — pas dans le flux principal.
L'interface de base est simple. La complexité se découvre quand on en a besoin.

### P7 — Accessibilité non négociable
- Navigation clavier complète (Tab, Entrée, Espace, Flèches)
- Ratio de contraste WCAG AA minimum (4.5:1 texte normal, 3:1 grands éléments)
- Cibles tactiles ≥ 44×44 px
- Pas de communication uniquement par la couleur (icône + couleur)

---

## 5. Les deux modes de l'application

### Mode Préparation
Activé par défaut à l'ouverture. Fond clair, dense en informations.

**Objectif** : Construire et organiser le contenu du service.
**Disponible** : Toujours (avant/après le service).
**Caractéristiques** :
- Panneau latéral sources (Chants, Bible, Annonces, Médias, Minuterie)
- Éditeur de plan central avec drag & drop
- Accès à la bibliothèque de chants
- Paramètres et apparence

### Mode Direct (Live)
Déclenché manuellement via le bouton **▶ DIRECT** ou `Ctrl+P`.

**Objectif** : Contrôler la projection en temps réel.
**Caractéristiques** :
- Interface sombre (fond quasi-noir)
- Aperçu large du slide courant (rendu réel)
- Slide suivant toujours visible
- Progression dans le plan
- Navigation clavier exclusive
- Indicateurs d'état des écrans A/B/C

**Transition** : Animation douce (300ms) du mode Préparation → Mode Direct.
Le plan n'est pas modifiable en Mode Direct (lecture seule, sauf ajout rapide d'urgence).

---

## 6. Système de Design

### 6.1 Palette de couleurs

#### Mode Préparation (thème clair)

| Token | Valeur | Usage |
|---|---|---|
| `--bg-base` | `#FAFAF9` | Fond principal |
| `--bg-surface` | `#FFFFFF` | Cards, panneaux |
| `--bg-elevated` | `#F4F4F5` | Hover, inputs |
| `--border` | `#E4E4E7` | Bordures subtiles |
| `--text-primary` | `#09090B` | Texte principal |
| `--text-secondary` | `#52525B` | Labels, descriptions |
| `--text-muted` | `#A1A1AA` | Placeholders, métadonnées |
| `--primary` | `#4F46E5` | Indigo — actions principales |
| `--primary-hover` | `#4338CA` | Hover sur primary |
| `--accent` | `#F59E0B` | Ambre — highlights, live |
| `--success` | `#10B981` | Confirmation, live actif |
| `--danger` | `#EF4444` | Suppression, erreurs |
| `--warning` | `#F59E0B` | Avertissements |

#### Mode Direct (thème sombre)

| Token | Valeur | Usage |
|---|---|---|
| `--bg-base` | `#0A0A0F` | Fond principal (quasi-noir) |
| `--bg-surface` | `#12121A` | Cards, panels |
| `--bg-elevated` | `#1C1C28` | Hover, surélévation |
| `--border` | `#2A2A3A` | Bordures |
| `--text-primary` | `#FAFAFA` | Texte principal |
| `--text-secondary` | `#A1A1AA` | Labels |
| `--text-muted` | `#52525B` | Désactivé |
| `--live-indicator` | `#22C55E` | Point vert clignotant |
| `--current-slide` | `#1E1B4B` | Fond du slide courant |
| `--next-slide` | `#1A1A25` | Fond du slide suivant |

#### Couleurs sémantiques (partagées)

| Token | Valeur | Usage |
|---|---|---|
| `--kind-song` | `#8B5CF6` | Icône/badge chant |
| `--kind-bible` | `#0EA5E9` | Icône/badge Bible |
| `--kind-announcement` | `#F59E0B` | Icône/badge annonce |
| `--kind-media` | `#EC4899` | Icône/badge média |
| `--kind-timer` | `#EF4444` | Icône/badge minuterie |

### 6.2 Typographie

| Rôle | Police | Taille | Poids |
|---|---|---|---|
| Interface principale | Inter Variable | 14px | 400 |
| Titres écrans | Inter Variable | 20-24px | 600 |
| Labels/boutons | Inter Variable | 13px | 500 |
| Métadonnées | Inter Variable | 12px | 400 |
| Aperçu slide — corps | Inter / Police custom | 16-20px | 400 |
| Aperçu slide — titre | Inter / Police custom | 18-24px | 600 |
| Références (versets, codes) | JetBrains Mono | 11px | 400 |

### 6.3 Espacements (base 4px)

```
xs:  4px    (gap interne bouton)
sm:  8px    (gap icon + texte)
md:  12px   (padding card compacte)
lg:  16px   (padding standard)
xl:  24px   (gap entre sections)
2xl: 32px   (padding page)
3xl: 48px   (espace entre groupes)
```

### 6.4 Composants clés

#### Plan Item Card
```
┌─────────────────────────────────────────────────────────────────┐
│ ⠿  🎵 CHANT    Saint Saint Saint (Hillsong)          [✎]  [✕]  │
│                Couplet 1 · Refrain · Couplet 2                  │
└─────────────────────────────────────────────────────────────────┘
  ^     ^  ^       ^                                  ^      ^
 drag  icône badge  titre                           éditer supprimer
```
- Hauteur : 56px (compact) ou 72px (avec aperçu des blocs)
- Fond `--bg-surface`, bordure gauche colorée par type (`--kind-*`)
- Au survol : légère élévation (shadow-sm), fond `--bg-elevated`
- En drag : élévation forte (shadow-lg), opacité 90%, curseur grab

#### Screen Selector
```
  ÉCRAN
  [● A]  [○ B]  [○ C]
   actif  inactif inactif
```
- Pillule 32px de hauteur
- Active : fond `--primary`, texte blanc
- Inactive : bordure `--border`, texte `--text-secondary`
- Verrouillé : icône cadenas, fond `--bg-elevated`

#### Navigation Live (boutons ◀ ▶)
```
  ┌────────────────┐   ┌────────────────┐
  │  ◀  Précédent  │   │  Suivant  ▶   │
  └────────────────┘   └────────────────┘
       h:48px                h:48px
```
- Hauteur 48px, coin arrondi 8px
- Feedback visuel au clic : légère compression (transform scale 0.97, 80ms)
- Désactivé si premier/dernier élément

#### Indicateur Live
```
  ● DIRECT    (rouge pulsant en live)
  ○ VEILLE    (gris en préparation)
```
- Point de 8px, animation pulse 1.5s en live
- Texte `--live-indicator` en vert quand projection active

### 6.5 Iconographie

Utiliser **Lucide React** (cohérence avec l'existant) avec ces correspondances :

| Élément | Icône |
|---|---|
| Chant | `Music` |
| Bible | `BookOpen` |
| Annonce texte | `Megaphone` |
| Annonce image | `Image` |
| PDF | `FileText` |
| Minuterie | `Timer` |
| Drag handle | `GripVertical` |
| Écran noir | `Square` (filled) |
| Écran blanc | `Square` (outline) |
| Mode Live | `PlayCircle` |
| Quitter Live | `StopCircle` |
| Écran projection | `Monitor` |

### 6.6 Animations et micro-interactions

| Interaction | Animation | Durée |
|---|---|---|
| Ouverture Mode Direct | Fade + léger zoom (1→1.02) | 300ms |
| Changement de slide | Fondu croisé | 150ms |
| Ajout item au plan | Slide-in depuis le bas | 200ms |
| Suppression item | Fade-out + collapse | 200ms |
| Drag & drop | Lift (shadow), placeholder ghost | Immédiat |
| Écran noir/blanc | Overlay fade | 200ms |
| Toast confirmation | Slide-in droite, auto-dismiss 3s | 200ms |
| Erreur | Shake subtil (3 oscillations) | 400ms |

### 6.7 États d'interface

Chaque élément interactif doit avoir des états explicites :

- **Default** : état normal au repos
- **Hover** : légère élévation ou changement de fond
- **Focus** : outline visible (`--primary` à 3px de distance)
- **Active** : légère compression au clic
- **Disabled** : opacité 40%, curseur not-allowed
- **Loading** : spinner ou skeleton, jamais de blocage long sans feedback
- **Error** : bordure rouge, message d'erreur sous l'élément concerné
- **Success** : icône checkmark, disparaît après 2s

---

## 7. Contraintes techniques à intégrer dans l'UX

- **Application desktop Electron** : pas de contraintes mobile, mais prévoir un responsive pour la fenêtre redimensionnable
- **Pas de réseau requis** : aucun état de chargement réseau pour le contenu local (Bible, chants, plans)
- **Multi-écrans via IPC** : la latence entre l'action et l'affichage sur l'écran de projection est < 100ms (considérer comme instantané)
- **SQLite local** : les sauvegardes sont immédiates, pas de concept de "brouillon"
- **Raccourcis globaux** : certains raccourcis (B, W, Espace) fonctionnent même si la fenêtre principale n'a pas le focus

---

*Document maintenu par l'équipe produit. À mettre à jour à chaque évolution majeure de l'interface.*
