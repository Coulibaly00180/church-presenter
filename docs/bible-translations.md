# Bible : traductions & stratégie Offline/Online

## Objectif
- **LSG 1910 offline** : fiable même sans internet (cible MVP)
- Autres traductions (Semeur/BDS, Parole de Vie/PDV, …) : souvent sous licence → on passera via un provider autorisé.

## Stratégie MVP
1) `LSG1910` **offline** (dataset local)
2) `WEB` (bible-api.com) comme fallback simple (sans clé)

## Pourquoi “cache dans le plan” ?
Quand on ajoute un passage au Plan, on stocke le texte dans l’item (`body` + `verses`).
Ainsi, en live:
- pas besoin de réseau
- pas de latence
- pas de panne si l’API est indisponible

## Dataset LSG1910
Dans ce patch, on ajoute un **mini dataset de test** (quelques versets) :
- Jean 3:16-18
- Psaume 23:1-3

Ensuite, on remplacera par un dataset complet (JSON) :
- structure optimisée pour l’accès (book → chapter → verse)
- recherche par référence (ex: "Jean 3:16-18")

## Étapes suivantes (Bible)
- intégrer le rendu `BIBLE_PASSAGE` dans PlanPage (affichage + projection + navigation)
- importer dataset LSG1910 complet
- ajouter la recherche “Livre + chapitre + versets” (autocomplete)
- provider “licensed” (YouVersion / API.Bible) pour BDS/PDV si on obtient l’accord
