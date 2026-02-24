# Church Presenter — Contenu & Messages

> Document UX — Rédaction, Ton de voix, Catalogue des messages
> Version 1.0 — Février 2026

---

## 1. Ton de voix

Church Presenter s'adresse à des opérateurs techniques qui travaillent sous pression. La communication de l'interface doit être :

### Principes rédactionnels

| Principe | Application |
|---|---|
| **Direct** | Aller droit au but. Pas de phrases longues dans l'interface. |
| **Positif** | Formuler ce qu'on peut faire, pas ce qu'on ne peut pas. |
| **Précis** | Nommer les choses exactement. Pas de vague. |
| **Respectueux** | Jamais condescendant. L'utilisateur sait ce qu'il fait. |
| **Sans jargon** | Pas de termes techniques internes (ID, UUID, PrismaError…). |

### Ce qu'on évite

- ❌ « Une erreur inattendue s'est produite. Veuillez réessayer. »
- ✅ « Impossible d'enregistrer le chant. Vérifie que le titre n'est pas vide. »

- ❌ « Êtes-vous sûr(e) de vouloir supprimer cet élément ? »
- ✅ « Supprimer ce chant ? Cette action est irréversible. »

- ❌ « Chargement en cours... »
- ✅ « Ouverture du plan… »

- ❌ « Succès ! »
- ✅ « Chant enregistré. »

---

## 2. Labels de navigation et d'interface

### Onglets du panneau latéral

| Valeur | Label affiché | Icône |
|---|---|---|
| `songs` | Chants | `Music` |
| `bible` | Bible | `BookOpen` |
| `announcements` | Annonces | `Megaphone` |
| `media` | Médias | `Image` |
| `timer` | Minuterie | `Timer` |

### Labels des types d'éléments (kind)

| Kind | Label court | Label complet |
|---|---|---|
| `SONG_BLOCK` | Chant | Bloc de chant |
| `ANNOUNCEMENT_TEXT` | Annonce texte | Annonce (texte) |
| `ANNOUNCEMENT_IMAGE` | Annonce image | Annonce (image) |
| `ANNOUNCEMENT_PDF` | PDF | Document PDF |
| `BIBLE_VERSE` | Verset | Verset biblique |
| `BIBLE_PASSAGE` | Passage | Passage biblique |
| `VERSE_MANUAL` | Verset libre | Verset saisi manuellement |
| `TIMER` | Minuterie | Compteur / minuterie |

### Labels des boutons d'action principaux

| Action | Bouton | Variante |
|---|---|---|
| Ajouter au plan | Ajouter | primary |
| Projeter immédiatement | Projeter | secondary |
| Enregistrer les modifications | Enregistrer | primary |
| Annuler les modifications | Annuler | ghost |
| Supprimer | Supprimer | destructive |
| Dupliquer | Dupliquer | ghost |
| Importer | Importer | secondary |
| Exporter | Exporter | ghost |
| Fermer | Fermer / ✕ | ghost |

### Labels du mode Direct

| Élément | Texte |
|---|---|
| Bouton démarrer live | ▶ Direct |
| Bouton quitter live | ◼ Quitter |
| Indicateur actif | ● EN DIRECT |
| Indicateur inactif | ○ Veille |
| Bouton écran noir | Noir |
| Bouton écran blanc | Blanc |
| Bouton reprendre | Reprendre |
| Écran A | A |
| Écran B | B |
| Écran C | C |

---

## 3. Messages de confirmation

> **Règle** : En mode Direct, aucune confirmation modale. Hors live uniquement.

### Suppression d'un élément du plan

```
Titre     : Supprimer cet élément ?
Corps     : « [Titre de l'élément] » sera retiré du plan.
            Cette action est irréversible.
Confirmer : Supprimer
Annuler   : Annuler
```

### Suppression d'un plan entier

```
Titre     : Supprimer ce plan ?
Corps     : Le plan du [date] et tous ses éléments seront supprimés définitivement.
Confirmer : Supprimer le plan
Annuler   : Annuler
```

### Suppression d'un chant de la bibliothèque

```
Titre     : Supprimer ce chant ?
Corps     : « [Titre du chant] » sera supprimé de la bibliothèque.
            Il sera retiré de tous les plans qui l'utilisent.
Confirmer : Supprimer
Annuler   : Annuler
```

### Quitter le mode Direct

```
Titre     : Quitter le mode Direct ?
Corps     : La projection sera interrompue sur tous les écrans.
Confirmer : Quitter
Annuler   : Rester en direct
```

### Remplacer un plan (import)

```
Titre     : Remplacer le contenu du plan ?
Corps     : Les [N] éléments importés remplaceront les éléments actuels.
Confirmer : Remplacer
Annuler   : Annuler
```

---

## 4. Messages de succès (toasts)

> Durée d'affichage : 3 secondes. Apparition depuis le bas-droite.

| Action | Message toast |
|---|---|
| Chant enregistré | « Chant enregistré. » |
| Chant supprimé | « Chant supprimé. » |
| Chant importé (1) | « 1 chant importé. » |
| Chants importés (N) | « [N] chants importés. » |
| Élément ajouté au plan | « Ajouté au plan. » |
| Plan dupliqué | « Plan dupliqué. » |
| Plan exporté | « Plan exporté : [nom_fichier].json » |
| Données exportées | « Export terminé. » |
| Données importées | « Import réussi — [N] chants, [M] plans. » |
| Paramètres sauvegardés | « Paramètres enregistrés. » |
| Raccourcis réinitialisés | « Raccourcis réinitialisés par défaut. » |

---

## 5. Messages d'erreur

### Erreurs de validation (formulaires)

| Champ | Condition | Message |
|---|---|---|
| Titre du chant | Vide | « Le titre est requis. » |
| Titre du chant | Trop long (>200 car.) | « Le titre ne peut pas dépasser 200 caractères. » |
| Titre du plan | Vide | « Le titre du plan est requis. » |
| Date du plan | Invalide | « Date invalide. Format attendu : JJ/MM/AAAA. » |
| Bloc de chant | Contenu vide | « Le bloc ne peut pas être vide. » |
| Import JSON | Fichier invalide | « Format de fichier invalide. Sélectionne un fichier JSON valide. » |
| Import Word | Fichier illisible | « Impossible de lire ce fichier. Vérifie qu'il n'est pas protégé. » |
| Bible search | Référence inconnue | « Référence introuvable. Exemple : Jean 3:16 ou Psaumes 23. » |

### Erreurs opérationnelles

| Situation | Message affiché |
|---|---|
| Plan introuvable | « Ce plan n'existe plus. Il a peut-être été supprimé. » |
| Chant introuvable | « Ce chant n'existe plus dans la bibliothèque. » |
| Base de données indisponible | « Impossible d'accéder aux données. Redémarre l'application. » |
| Fichier média manquant | « Fichier introuvable : [nom_fichier]. Il a peut-être été déplacé ou supprimé. » |
| Import : plan déjà existant | « Un plan existe déjà pour cette date. Le nouveau plan a été créé le [date+1]. » |
| Projection écran échoué | « Impossible d'ouvrir l'écran [A/B/C]. Vérifie que l'écran est connecté. » |
| Export annulé | — (pas de toast, action annulée silencieusement) |

### Format des messages d'erreur inline

```
Structure : [Icône ⚠] [Message court]
                      [Action corrective si applicable]

Exemple :
  ⚠ Fichier introuvable.
    Resélectionner le fichier
```

---

## 6. États vides (Empty States)

### Plan sans éléments

```
[Icône : ListX, 48px, text-muted]
Aucun élément dans ce plan

Ajoute du contenu depuis le panneau de gauche :
chants, versets bibliques, annonces, médias ou minuterie.

[Bouton ghost : Importer depuis Word]
```

### Bibliothèque de chants vide

```
[Icône : Music, 48px, text-muted]
Bibliothèque vide

Tu n'as pas encore de chants.
Crée ton premier chant ou importe une bibliothèque existante.

[Bouton primary : Nouveau chant]
[Bouton ghost : Importer]
```

### Recherche sans résultats — Chants

```
[Icône : SearchX, 40px, text-muted]
Aucun chant trouvé pour « [terme] »

Vérifie l'orthographe ou essaie un autre mot-clé.

[Bouton ghost : Créer « [terme] »]
```

### Recherche sans résultats — Bible

```
[Icône : BookX, 40px, text-muted]
Référence introuvable

Exemples de formats acceptés :
  Jean 3:16     → un verset
  Jean 3:16-18  → une plage
  Psaumes 23    → un chapitre complet
```

### Pas de plan ouvert

```
[Icône : CalendarX, 48px, text-muted]
Aucun plan sélectionné

Ouvre un plan depuis le calendrier ou crée-en un nouveau.

[Bouton primary : Nouveau plan]
```

### Aucun plan dans la liste

```
[Icône : Calendar, 48px, text-muted]
Aucun plan créé

Commence par créer le plan de ton prochain service.

[Bouton primary : Créer un plan]
```

### Mode Direct — plan vide

```
[Icône : ListX, 64px, text-muted/30]
Plan vide

Ajoute des éléments au plan avant de démarrer le direct.

[Bouton : Quitter le mode Direct]
```

---

## 7. Messages contextuels et guides inline

### Astuce premier lancement

```
Premier lancement ? Commence par créer un plan ou importer ta bibliothèque de chants.
[Lien : Comment démarrer →]
```

### Indication dans l'éditeur de chant (bloc vide)

```
placeholder textarea : Saisis les paroles de ce bloc…
```

### Indication dans le champ de recherche Bible

```
placeholder : Jean 3:16 ou Psaumes 23
```

### Indication dans le champ de recherche chants

```
placeholder : Rechercher par titre, artiste ou paroles…
```

### Indication mode Direct (écran déconnecté)

```
[⚠ badge orange] Écran B non connecté
```

### Badge "Non enregistré" dans l'éditeur

```
● Modifications non enregistrées
```

---

## 8. Raccourcis — libellés et descriptions

> Utilisés dans la page Paramètres > Raccourcis et dans la cheatsheet (overlay `?`).

| Action | Touche par défaut | Description affichée |
|---|---|---|
| Élément précédent | `←` ou `Q` | Revenir à l'élément précédent |
| Élément suivant | `→` ou `Espace` ou `D` | Passer à l'élément suivant |
| Écran A | `1` | Sélectionner l'écran A |
| Écran B | `2` | Sélectionner l'écran B |
| Écran C | `3` | Sélectionner l'écran C |
| Écran noir | `B` | Basculer en écran noir |
| Écran blanc | `W` | Basculer en écran blanc |
| Reprendre | `R` | Revenir à la projection normale |
| Basculer projection | `Ctrl+P` | Démarrer / quitter le mode Direct |
| Aide raccourcis | `?` | Afficher / masquer la liste des raccourcis |

---

## 9. Libellés de l'écran de projection (ProjectionPage)

> Textes affichés sur l'écran projeté — jamais vus par le public, sauf états spéciaux.

### Écran noir

```
[Fond noir pur — aucun texte visible par le public]
[Overlay côté opérateur : "Écran noir actif" en micro-texte coin bas-droit]
```

### Écran blanc

```
[Fond blanc pur — aucun texte visible par le public]
```

### Écran en attente (aucun contenu projeté)

```
[Fond selon l'apparence configurée — pas de contenu]
```

### Minuterie — alerte fin de temps

```
[Texte rouge clignotant : 00:00]
[Animation : pulse sur le fond]
```

---

## 10. Messages d'état réseau (synchronisation)

| État | Badge | Message |
|---|---|---|
| Serveur démarré | ● vert | Sync réseau active — port 9477 |
| Client connecté | ● vert | [N] client(s) connecté(s) |
| Serveur arrêté | ○ gris | Sync réseau désactivée |
| Erreur port occupé | ⚠ orange | Port 9477 déjà utilisé. Change le port dans Paramètres. |

---

## 11. Règles de formatage des dates

| Contexte | Format | Exemple |
|---|---|---|
| Liste des plans | `EEEE d MMMM yyyy` | Dimanche 23 février 2026 |
| Titre de plan (court) | `d MMM yyyy` | 23 févr. 2026 |
| Calendrier (cellule) | `d` | 23 |
| Nom de fichier export | `yyyy-MM-dd` | 2026-02-23 |
| Toast ("plan du…") | `d MMMM` | 23 février |

> Locale : `fr-FR`. Utiliser `Intl.DateTimeFormat` ou `date-fns/locale/fr`.

---

## 12. Abréviations et conventions typographiques

| Terme complet | Abréviation | Usage |
|---|---|---|
| Couplet | — | Toujours en toutes lettres |
| Refrain | Ref. | Seulement dans les badges compacts |
| Pont | — | Toujours en toutes lettres |
| Introduction | Intro | Acceptable dans les labels |
| Verset | V. | Dans les badges si espace insuffisant |
| Chapitre | Ch. | Dans les badges si espace insuffisant |

### Guillemets et ponctuation

- Utiliser les guillemets français : « texte » (pas "texte")
- Espace insécable avant : `!`, `?`, `;`, `:`
- Les titres de chants et de plans prennent une majuscule initiale uniquement

---

*Document de référence rédactionnel — à mettre à jour à chaque ajout de fonctionnalité ou message.*
