# `kind` : le type d’un item de Plan

Dans Church Presenter, un **Plan** est une liste d’items (chants, annonces, passages bibliques…).
Chaque item possède un champ `kind` qui sert de **type / discriminant**.

## Pourquoi on a besoin de `kind` ?
`kind` permet au code de :
- **rendre** correctement l’item dans l’UI (icône, titre, champs à afficher),
- **projeter** correctement (texte simple, bloc de chant, image/PDF, lower-third…),
- **valider** les données (quels champs existent),
- **évoluer** sans casser l’existant (on ajoute de nouveaux kinds).

Sans `kind`, on serait obligé de deviner le type à partir des champs présents (fragile).

## Exemples de `kind`
- `SONG_BLOCK` : un bloc de chant (couplet, refrain…)
- `ANNOUNCEMENT_TEXT` : annonce texte
- `ANNOUNCEMENT_IMAGE` : annonce image
- `BIBLE_PASSAGE` : passage biblique (référence + traduction + texte)

## Convention proposée
- `kind` en **MAJUSCULE** avec underscore.
- Un item doit contenir **les champs nécessaires** à son rendu/projection.
- Pour les sources externes (API), on **cache** le résultat dans l’item (ex: `body`) pour être robuste en live.

## Exemple d’item Bible (MVP)
```ts
{
  kind: "BIBLE_PASSAGE",
  reference: "Jean 3:16-18",
  translation: "LSG1910",
  title: "Jean 3:16-18 (LSG1910)",
  body: "3:16 ...\n\n3:17 ...",
  verses: [{ chapter: 3, verse: 16, text: "..." }, ...]
}
```

## Où `kind` est utilisé ?
- **PlanPage** : pour afficher chaque item et proposer les actions
- **Régie (Live)** : pour savoir quoi projeter (et comment)
- **Projection** : pour afficher le bon rendu final
