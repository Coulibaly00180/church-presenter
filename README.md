# Church Presenter

**Church Presenter** est une application de bureau open-source destinée aux techniciens son/lumière et aux responsables de culte. Elle centralise la gestion et la projection du contenu visuel pendant les services religieux : chants, passages bibliques, annonces, médias et minuteries.

L'application tourne entièrement **hors-ligne** (Bible LSG 1910 embarquée, base de données locale SQLite) et prend en charge jusqu'à **trois écrans de projection indépendants** (A, B, C) avec un pilotage clavier complet.

> Conçue pour les équipes techniques d'église qui ont besoin d'un outil fiable, rapide et sans dépendance réseau le dimanche matin.

## Fonctionnalités

**Bibliothèque de chants** — Gestion complète des chants (couplets, refrains, ponts). Import/export Word (DOCX) et JSON. Recherche instantanée par titre, artiste ou paroles.

**Bible hors-ligne** — Texte intégral LSG 1910 inclus, sans connexion nécessaire. Recherche de passages (ex. `Jean 3:16-18`), ajout direct au déroulé.

**Déroulé de service** — Composition par glisser-déposer (drag & drop depuis le panneau latéral). Types d'éléments : chant, passage biblique, verset manuel, annonce texte, annonce image, PDF, minuterie. Un déroulé par date, calendrier intégré, duplication d'éléments, édition en place, modèles réutilisables. Import depuis fichier Word (.docx) ou texte (.txt).

**Projection multi-écrans** — Trois écrans (A, B, C) avec mode miroir configurable. Envoi de contenu différent par écran. Personnalisation de l'apparence : couleurs, taille du texte, image de fond. Modes noir / blanc pour les transitions.

**Pilotage en direct** — Navigation clavier complète. Raccourcis personnalisables. Barre de contrôle avec sélection d'écran, verrouillage et aperçu enrichi (élément précédent, courant, suivant). Historique des projections de la session. Mode boucle avec intervalle configurable. Projection rapide de texte libre ou média.

**Minuterie** — Compte à rebours intégré au déroulé. Affichage plein écran sur la projection avec alerte visuelle en fin de décompte.

**Synchronisation réseau** — Serveur WebSocket intégré (port 9477) pour piloter la projection depuis un autre poste du réseau local. Les clients distants reçoivent l'état en temps réel et peuvent envoyer des commandes (suivant, précédent, noir, blanc, curseur).

**Import / Export** — Export/import en masse des données (JSON zippé). Modes MERGE ou REPLACE avec gestion atomique des erreurs.

## Raccourcis clavier

| Action | Touches |
| --- | --- |
| Élément précédent | `←` `Q` |
| Élément suivant | `→` `Espace` `D` |
| Écran A / B / C | `1` `2` `3` |
| Écran noir | `B` |
| Écran blanc | `W` |
| Reprendre | `R` |
| Basculer projection | `Ctrl+P` |

Les raccourcis sont personnalisables depuis les paramètres de l'application.

## Prérequis

- Node.js 20+
- npm 10+

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

L'application Electron s'ouvre avec rechargement à chaud (electron-vite).

## Qualité du code

```bash
npm run lint        # ESLint strict (0 warning toléré)
npm run typecheck   # TypeScript mode strict
npm run test        # Tests unitaires et d'intégration (Vitest)
```

## Build

```bash
npm run build       # Compilation (electron-vite build)
npm run dist:win    # Installeur Windows (NSIS)
```

## Base de données

SQLite via Prisma. En développement, la base se trouve dans `apps/data/app.db` ; en production, dans le répertoire `userData` de l'application.

```bash
# Régénérer le client Prisma (exécuté automatiquement au postinstall)
npm run prisma:generate -w @cp/desktop

# Migration sécurisée (sauvegarde automatique avant migration)
npm run db:migrate:safe -w @cp/desktop
```

Les fichiers de base de données sont ignorés par Git.

## Architecture

```text
apps/desktop/
├── src/
│   ├── main/            # Process principal Electron
│   │   ├── main.ts      #   Fenêtres, état live, enregistrement IPC
│   │   └── ipc/         #   Handlers IPC (songs, plans, bible, screens, live, sync…)
│   ├── preload/         # Bridge sécurisé → window.cp.*
│   ├── renderer/src/    # Application React
│   │   ├── pages/       #   MainPage (régie) + ProjectionPage (plein écran)
│   │   ├── components/  #   layout, plan, source, dialogs, ui
│   │   └── lib/         #   Projection, raccourcis, utilitaires
│   └── shared/          # Contrats IPC TypeScript (ipc.ts)
└── prisma/              # Schéma et migrations SQLite
```

**Modèle trois processus** : main (backend + fenêtres) → preload (bridge IPC) → renderer (React 19, Tailwind CSS 4, Radix UI).

**Canaux IPC** : `songs:*`, `plans:*`, `bible:*`, `screens:*`, `live:*`, `projection:*`, `sync:*`, `data:*`, `files:*`.

## Stack technique

| Couche | Technologies |
| --- | --- |
| Desktop | Electron 40, electron-vite, electron-builder |
| Frontend | React 19, React Router 7, Tailwind CSS 4, Radix UI, dnd-kit |
| Backend | Prisma 6, SQLite (better-sqlite3), WebSocket (ws) |
| Qualité | TypeScript strict, ESLint (typescript-eslint), Vitest |
| CI/CD | GitHub Actions — lint, typecheck, tests, build, audit, packaging Windows |

## CI/CD

Le pipeline GitHub Actions (`.github/workflows/ci.yml`) s'exécute sur chaque push et pull request avec annulation automatique des exécutions concurrentes :

1. **Vérification** (Ubuntu) — lint → typecheck → tests → build → audit de sécurité
2. **Packaging Windows non signé** — génère l'installeur NSIS, artefact conservé 14 jours

Les artefacts `.exe` et `.yml` sont disponibles dans l'onglet Actions de chaque exécution.

> Le job de signature (certificat de code signing Windows) est désactivé pour le moment. Il pourra être réactivé dans le workflow quand un certificat sera disponible.

## Règles métier

- Un seul déroulé par date. En cas de conflit, la date suivante disponible est automatiquement choisie.
- Les fichiers média sont stockés dans `userData/media/` avec validation de chemin pour la sécurité.
- L'application fonctionne entièrement hors-ligne ; aucune connexion réseau n'est requise pour la projection.
