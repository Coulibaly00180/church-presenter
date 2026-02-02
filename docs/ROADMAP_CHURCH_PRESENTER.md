# 📘 Church Presenter — Roadmap & Spécifications

## 🎯 Objectif du projet
Créer une application de projection pour église permettant :
- Gestion des chants
- Gestion des passages bibliques
- Préparation des cultes (plans)
- Projection multi-écrans (A/B/C)
- Pilotage live (clavier)
- Import / export (Word, JSON)

---

# 🟥 PRIORITÉ 1 — UTILISABLE EN VRAI CULTE (CRITIQUE)

## 1.1 Live (projection temps réel)
### À faire / finaliser
- État Live centralisé (source de vérité unique)
- Synchronisation entre :
  - Régie
  - Plan
  - Écrans A/B/C
- Navigation clavier :
  - ← / → : précédent / suivant
  - Espace / Entrée : reprojeter
  - B : noir
  - W : blanc
  - R : reprendre
  - 1 / 2 / 3 : écran A / B / C
- Verrouillage écran (lock A/B/C)

🎯 Objectif : un culte peut être géré sans souris.

---

## 1.2 Projection (rendu)
### Spécifications
- Rendu uniforme pour :
  - Chants
  - Bible
  - Annonces
- Pas de scrollbars
- Marges fixes
- Options :
  - Plein écran
  - Lower-third

---

## 1.3 Plan (déroulé du culte)
### À finaliser
- Support des types :
  - Chant
  - Verset biblique
  - Passage biblique
  - Texte d’annonce
  - Image / PDF (plus tard)
- Drag & drop stable
- Bouton “Projeter”
- Synchronisation automatique avec Live

---

## 1.4 Bible
### Fonctionnalités
- Affichage :
  - Jean 3:16 (LSG 1910)
- Navigation :
  - verset par verset
  - passage complet
- Traductions prévues :
  - LSG 1910 (offline)
  - Semeur
  - Parole de Vie
  - autres (API plus tard)

---

# 🟧 PRIORITÉ 2 — PRÉPARATION DES CULTES

## 2.1 Calendrier
### À faire
- Vue calendrier
- Un plan = une date
- Dupliquer un plan passé
- Modèles de culte (templates)

---

## 2.2 Historique
### À faire
- Liste des cultes passés
- Boutons :
  - Dupliquer
  - Exporter

---

# 🟨 PRIORITÉ 3 — IMPORT / EXPORT DES CHANTS

## 3.1 Format Word (DOCX) — basé sur format réel

### Format officiel reconnu
```
Titre : ...
Auteur : ...
Année de parution : ...
Album : ...

Paroles :
texte libre
```

### Règles d’import
- Champs lus :
  - Titre
  - Auteur
  - Année
  - Album
- Tout ce qui suit Paroles : = contenu projetable
- Détection optionnelle :
  - Refrain :
  - sinon → texte continu

❌ Pas d’obligation de :
- couplet structuré
- balises spéciales

---

## 3.2 Export Word
- Générer un .docx avec :
```
Titre :
Auteur :
Année :
Album :

Paroles :
...
```

---

## 3.3 Export / Import JSON
### Objectif
- Sauvegarde complète :
  - chants
  - plans
  - paramètres

---

# 🟩 PRIORITÉ 4 — ANNONCES / MÉDIAS

### À faire
- Import images
- Import PDF
- PDF page par page
- Ajout au plan
- Projection

---

# 🟦 PRIORITÉ 5 — UX / DESIGN

### À faire
- Menu clair :
  - Régie
  - Plan
  - Chants
  - Bible
  - Calendrier
  - Historique
- Couleurs sobres
- Boutons larges pour culte
- Icônes
- Badges :
  - LIVE
  - LOCK
  - A / B / C

---

# 🟪 PRIORITÉ 6 — TECHNIQUE / DISTRIBUTION

### À faire
- Installateur Windows
- Base de données dans AppData
- Sauvegarde automatique
- Export global

---

# 📌 RÉSUMÉ DES PRIORITÉS

| Priorité | Thème |
|----------|------|
| P1 | Live + projection + clavier |
| P2 | Plan + calendrier |
| P3 | Import/export Word & JSON |
| P4 | Annonces (PDF/image) |
| P5 | UX/UI |
| P6 | Packaging |
