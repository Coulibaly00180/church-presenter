# Church Presenter — Analyse Concurrentielle

> Document UX — Benchmark, Positionnement, Décisions de Design
> Version 1.0 — Février 2026

---

## 1. Périmètre de l'analyse

### Logiciels analysés

| Logiciel | Éditeur | Prix | Plateforme |
|---|---|---|---|
| **ProPresenter 7** | Renewed Vision | ~$500 + $99/an | Windows, macOS |
| **EasyWorship 7** | Softouch | ~$349 + $99/an | Windows |
| **OpenLP 3** | OpenLP Team | Gratuit (open-source) | Windows, macOS, Linux |
| **MediaShout 7** | WordSoft | ~$249 + abonnement | Windows |
| **Presenter Plus** | Various | Gratuit / freemium | Windows |

### Critères d'évaluation

1. Navigation en mode live (vitesse, clavier-first)
2. Gestion de la bibliothèque de chants
3. Intégration Bible
4. Courbe d'apprentissage
5. Mode hors-ligne
6. Multi-écrans
7. Prix et modèle commercial
8. Import/export
9. Interface — clarté et densité

---

## 2. ProPresenter 7

### Points forts

- **Navigation live** : excellent. Espace = suivant, flèches = navigation entre slides d'un élément. Barre de progression en bas. Aperçu en temps réel.
- **Multi-écrans** : très puissant. Jusqu'à 4+ sorties indépendantes avec layouts configurables par écran.
- **Bibliothèque** : riche. Tags, groupes, historique des présentations.
- **Médias** : gestion avancée (vidéo loop, audio, annonces en couche).
- **NDI** : envoi et réception vidéo réseau (usage broadcast).

### Points faibles

- **Prix élevé** : investissement significatif pour une petite église.
- **Complexité** : interface dense, courbe d'apprentissage de plusieurs heures.
- **Bible** : nécessite un achat séparé ou import manuel des textes.
- **Dépendance réseau** : licence en ligne, certaines fonctionnalités cloud.
- **Sur-ingénierie** : fonctionnalités broadcast (NDI, Stage Display) rarement utiles pour une petite église.

### Décisions prises pour Church Presenter

> ✅ Reprendre : barre de navigation live avec aperçu slide suivant
> ✅ Reprendre : raccourcis Espace/flèches pour la navigation
> ✅ Reprendre : indicateur d'état de projection toujours visible
> ❌ Éviter : l'interface à multiples panneaux empilés (trop dense)
> ❌ Éviter : la licence en ligne et le modèle abonnement

---

## 3. EasyWorship 7

### Points forts

- **Facilité d'utilisation** : meilleure courbe d'apprentissage de la catégorie.
- **Bible intégrée** : nombreuses traductions incluses ou téléchargeables.
- **Plan de service** : drag & drop intuitif, prévisualisation dans la liste.
- **Templates** : nombreux modèles de présentation inclus.
- **Import Word** : import natif des présentations PowerPoint et Word.

### Points faibles

- **Windows uniquement** : pas de version macOS.
- **Performances** : lent au démarrage sur configurations modestes.
- **Recherche** : la recherche dans les paroles de chants est lente sur grandes bibliothèques.
- **Export** : format propriétaire, migration difficile.
- **Mode live** : moins de raccourcis clavier que ProPresenter.

### Décisions prises pour Church Presenter

> ✅ Reprendre : Bible intégrée et hors-ligne (LSG 1910 embarquée)
> ✅ Reprendre : import Word natif pour le plan de service
> ✅ Reprendre : drag & drop intuitif dans le plan
> ✅ Reprendre : format export ouvert (JSON) pour faciliter la migration
> ❌ Éviter : le format propriétaire fermé
> ❌ Éviter : les templates complexes qui complexifient l'interface

---

## 4. OpenLP 3

### Points forts

- **Gratuit et open-source** : aucun coût, code auditable.
- **Multi-plateformes** : Windows, macOS, Linux.
- **Bible** : nombreuses traductions, format ouvert (Zefania XML).
- **Remote** : interface web intégrée pour pilotage depuis smartphone.
- **Format ouvert** : données exportables, pas de lock-in.

### Points faibles

- **Interface vieillissante** : ergonomie Qt desktop des années 2010.
- **Navigation live** : peu intuitive, pas de vue deux slides (courant + suivant).
- **Bibliothèque de chants** : recherche lente, pas de recherche dans les paroles.
- **Multi-écrans** : basique. Un seul écran de projection principal.
- **Plugins** : qualité inégale, certains non maintenus.
- **Crashes** : signalés sur certaines configurations Windows 11.

### Décisions prises pour Church Presenter

> ✅ Reprendre : open-source, format ouvert, pas de lock-in
> ✅ Reprendre : synchronisation réseau (WebSocket ici vs HTTP)
> ✅ Reprendre : gratuit, accessible à toutes les tailles d'église
> ❌ Éviter : l'interface Qt vieillissante → React + Tailwind moderne
> ❌ Éviter : les plugins tiers de qualité variable → fonctionnalités intégrées only

---

## 5. Tableau de positionnement comparatif

### Fonctionnalités clés

| Fonctionnalité | ProPresenter | EasyWorship | OpenLP | **Church Presenter** |
|---|---|---|---|---|
| Navigation live clavier | ✅ Excellent | ✅ Bon | ⚠ Partiel | ✅ Clavier-first |
| Aperçu slide suivant | ✅ | ✅ | ❌ | ✅ |
| Multi-écrans A/B/C | ✅ (4+) | ✅ (2) | ⚠ (1) | ✅ (3) |
| Bible hors-ligne | ⚠ Achat | ✅ | ✅ | ✅ LSG 1910 |
| Import Word | ✅ | ✅ | ⚠ | ✅ .docx + .txt |
| Export JSON ouvert | ❌ | ❌ | ⚠ | ✅ |
| Synchronisation réseau | ❌ Cloud | ❌ | ✅ HTTP | ✅ WebSocket |
| Hors-ligne complet | ⚠ Licence | ✅ | ✅ | ✅ |
| Interface moderne | ✅ | ✅ | ❌ | ✅ React + Tailwind |
| Gratuit | ❌ | ❌ | ✅ | ✅ |
| Open-source | ❌ | ❌ | ✅ | ✅ |

### Positionnement

```
                     COMPLEXITÉ →
                Simple           Puissant
         ┌─────────────────────────────────────┐
     │   │  Church Presenter ★  │ ProPresenter │
  G  │   │  OpenLP              │              │
  R  │   │─────────────────────────────────────│
  A  │   │                      │ EasyWorship   │
  T  │   │                      │              │
  U  │   └─────────────────────────────────────┘
  I  │
  T  │
     ↓ PAYANT
```

**Positionnement cible** : Simple mais complet. Gratuit et open-source.
Le seul outil qui réunit : interface moderne + clavier-first + hors-ligne + multi-écrans + gratuit.

---

## 6. Patterns UX repris et adaptés

### De ProPresenter — Navigation live

**Pattern original** : Barre inférieure avec slide courant + suivant, navigation Espace.
**Adaptation** : LiveBar en haut (non en bas) pour dégager la visibilité du plan. Aperçu courant/suivant plus grand.

### D'EasyWorship — Plan de service

**Pattern original** : Liste latérale avec aperçu miniature dans chaque ligne.
**Adaptation** : PlanItemCard avec badges colorés par type plutôt que miniature (trop dense sur petite fenêtre).

### D'OpenLP — Synchronisation réseau

**Pattern original** : Serveur HTTP + interface web sur smartphone.
**Adaptation** : WebSocket (push temps-réel vs polling HTTP) avec état centralisé dans le main process Electron.

### D'EasyWorship — Import Word

**Pattern original** : Import natif de fichiers Word pour le contenu.
**Adaptation** : Import via mammoth.js (extraction texte brut), chaque ligne devient un élément ANNOUNCEMENT_TEXT.

---

## 7. Décisions de design différenciantes

### 7.1 Deux modes distincts (Préparation / Direct)

**Différence vs concurrents** : ProPresenter et EasyWorship ont une interface unique avec des zones live/edit mélangées.
**Notre choix** : Deux modes avec transition consciente. En mode Direct, l'interface est épurée et clavier-first. Cette séparation réduit les erreurs en live.
**Risque** : La transition peut surprendre les nouveaux utilisateurs.
**Mitigation** : Bouton ▶ Direct visible et bien labellisé. Transition animée (300ms).

### 7.2 SQLite local sans abonnement cloud

**Différence vs concurrents** : ProPresenter et EasyWorship nécessitent une validation de licence en ligne.
**Notre choix** : Tout en local. Pas de compte requis, pas de connexion réseau pour la projection.
**Avantage** : Fiabilité totale le dimanche matin (pas de panne réseau possible).
**Limitation** : Pas de synchronisation automatique entre postes (export/import manuel).

### 7.3 Format JSON ouvert pour l'export

**Différence vs concurrents** : Formats propriétaires fermés (`.pro7`, `.ewp`).
**Notre choix** : JSON standard, structure documentée.
**Avantage** : Migration possible, pas de lock-in, sauvegarde lisible.

### 7.4 TypeScript strict + tests Vitest

**Différence vs concurrents** : Logiciels propriétaires sans contrainte de qualité visible.
**Notre choix** : Zéro warning ESLint, mode strict TypeScript, tests d'intégration sur les handlers IPC.
**Avantage** : Réduction des régressions, confiance en production.

### 7.5 Couleurs sémantiques par type d'élément

**Différence vs concurrents** : OpenLP utilise des icônes uniquement sans couleur. ProPresenter n'a pas de distinction visuelle dans le plan.
**Notre choix** : Bordure gauche colorée + badge par kind (`--kind-song` violet, `--kind-bible` bleu, etc.).
**Avantage** : Identification ultra-rapide du type d'élément en un coup d'œil.

---

## 8. Fonctionnalités consciemment exclues

| Fonctionnalité | Pourquoi exclue |
|---|---|
| Vidéo loop / médias vidéo | Complexité technique élevée, usage rare dans les petites églises. À planifier en v2. |
| PowerPoint import | Mammoth.js ne gère pas les slides PPT. Hors périmètre. |
| Stage display (retour scène) | Complexité multi-écrans supplémentaire. L'écran B/C peut servir de moniteur retour. |
| Cloud sync | Contraire au principe offline-first. |
| Plugins tiers | Qualité inégale, maintenance difficile. |
| Enregistrement audio/vidéo | Hors périmètre (outils dédiés existent). |
| Édition de médias | Hors périmètre (Photoshop, Canva pour la préparation). |
| Sous-titres automatiques | ML complexe, hors périmètre. |

---

## 9. Opportunités futures (Backlog inspiré de la concurrence)

| Fonctionnalité | Inspiration | Priorité backlog |
|---|---|---|
| Stage display dédié (compte à rebours pour prédicateur) | ProPresenter | P2 |
| Bibles supplémentaires (NEG, BDS, NBS) | EasyWorship | P2 |
| Import/export PowerPoint (pptx → slides) | EasyWorship | P3 |
| Interface web mobile pour pilotage distant | OpenLP | P2 |
| Historique des présentations (replay) | ProPresenter | P3 |
| Templates de plan de service | EasyWorship | P2 |
| Annonces en boucle automatique (prélude) | ProPresenter | P2 |
| Alertes météo / scrolling ticker | MediaShout | P3 |

---

*Document d'analyse — à mettre à jour lors de nouvelles versions majeures des concurrents ou de l'ajout de fonctionnalités.*
