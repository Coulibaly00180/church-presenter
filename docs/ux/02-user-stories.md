# Church Presenter — User Stories

> Document UX — Backlog produit complet
> Format : `En tant que [persona] / Je veux [action] / Afin de [bénéfice]`
> Priorités : **P1** critique · **P2** important · **P3** nice-to-have
> Complexité : **XS** < 1j · **S** 1-2j · **M** 3-5j · **L** 1-2sem · **XL** > 2sem

---

## Epic 1 — Onboarding & Premier démarrage

### US-001 : Accueil premier lancement
**En tant que** nouvel utilisateur
**Je veux** être guidé à l'ouverture de l'app pour la première fois
**Afin de** comprendre l'interface sans avoir à lire une documentation

**Critères d'acceptation :**
- [ ] Si aucune donnée n'existe, afficher un écran de bienvenue avec 3 actions : « Importer mes chants », « Créer mon premier plan », « Découvrir l'interface »
- [ ] Un tour guidé optionnel (tooltip séquentiel) couvre : panneau sources, plan, bouton Live
- [ ] Le tour peut être sauté et relancé depuis Aide > Tutoriel
- [ ] Si des données existent (import/restauration), passer directement au plan du jour

**Priorité :** P2 · **Complexité :** M

---

### US-002 : Import initial de chants
**En tant que** coordinatrice
**Je veux** importer ma bibliothèque de chants existante en une seule fois
**Afin de** ne pas re-saisir 50 chants un par un

**Critères d'acceptation :**
- [ ] Import Word (.docx) avec auto-détection des sections (Couplet, Refrain, Pont)
- [ ] Import JSON (format Church Presenter)
- [ ] Import d'un dossier de fichiers Word (import en masse)
- [ ] Rapport de résultat : « X chants importés, Y erreurs » avec liste des fichiers en erreur
- [ ] Les doublons sont détectés (même titre) et l'utilisateur choisit : ignorer, remplacer, importer quand même

**Priorité :** P1 · **Complexité :** M

---

## Epic 2 — Dashboard & Navigation globale

### US-010 : Tableau de bord
**En tant qu'** opérateur
**Je veux** voir en un coup d'œil l'état de l'application à l'ouverture
**Afin de** savoir immédiatement où j'en suis et accéder rapidement au plan du jour

**Critères d'acceptation :**
- [ ] À l'ouverture, afficher le plan du jour si un plan existe pour aujourd'hui, sinon le dernier plan utilisé
- [ ] Zone « Prochains cultes » : liste des 5 plans à venir avec leur date et titre
- [ ] Zone « Accès rapide » : Bibliothèque de chants, Paramètres, Import/Export
- [ ] Compteur : nombre de chants dans la bibliothèque
- [ ] Si aucun plan existe : call-to-action centré « Créer le plan du dimanche »

**Priorité :** P2 · **Complexité :** S

---

### US-011 : Sélection du plan actif
**En tant que** coordinatrice
**Je veux** choisir sur quel plan je travaille
**Afin de** préparer le service de n'importe quelle date

**Critères d'acceptation :**
- [ ] Sélecteur de plan dans la barre de titre (dropdown avec date + titre)
- [ ] Liste triée par date décroissante, 50 plans max affichés
- [ ] Indicateur visuel sur le plan du jour (badge « Aujourd'hui »)
- [ ] Raccourci pour créer un nouveau plan depuis le sélecteur

**Priorité :** P1 · **Complexité :** XS

---

## Epic 3 — Déroulé de service (Plan)

### US-020 : Créer un plan de service
**En tant que** coordinatrice
**Je veux** créer un nouveau plan pour une date donnée
**Afin de** préparer le service de la semaine

**Critères d'acceptation :**
- [ ] Bouton « + Nouveau plan » accessible depuis la barre de titre et le tableau de bord
- [ ] Saisie obligatoire : date (sélecteur calendrier, J+7 par défaut)
- [ ] Titre optionnel (défaut : « Culte »)
- [ ] Si un plan existe déjà pour cette date : proposer de l'ouvrir OU de créer en décalant la date
- [ ] Plan immédiatement ouvert après création

**Priorité :** P1 · **Complexité :** XS

---

### US-021 : Ajouter un élément au plan
**En tant que** coordinatrice
**Je veux** ajouter différents types de contenu au plan
**Afin de** composer le déroulé complet du service

**Critères d'acceptation :**
- [ ] Bouton « + » flottant en bas du plan OU zone de drop depuis les panneaux sources
- [ ] Types supportés : Chant (bloc), Passage Bible, Verset manuel, Annonce texte, Annonce image, PDF, Minuterie
- [ ] L'ajout positionne l'élément à la fin du plan (ou à la position ciblée en drag & drop)
- [ ] Animation de confirmation : l'élément glisse à sa position
- [ ] Chaque ajout déclenche une sauvegarde silencieuse (pas de bouton Enregistrer)

**Priorité :** P1 · **Complexité :** S

---

### US-022 : Réorganiser le plan par drag & drop
**En tant que** coordinatrice
**Je veux** réordonner les éléments du plan en les faisant glisser
**Afin d'** ajuster rapidement la séquence du service

**Critères d'acceptation :**
- [ ] Poignée de drag visible (⠿) sur chaque élément au survol
- [ ] Pendant le drag : l'élément « lévite » (shadow + légère opacité), une ligne-guide montre la destination
- [ ] Le drop réordonne instantanément la liste (pas de lag)
- [ ] L'ordre est sauvegardé automatiquement après le drop
- [ ] Raccourci clavier alternatif : sélectionner un item + Alt+↑/↓ pour le déplacer

**Priorité :** P1 · **Complexité :** S

---

### US-023 : Éditer un élément du plan
**En tant que** coordinatrice
**Je veux** modifier le titre et le contenu d'un élément
**Afin de** corriger une erreur ou adapter le texte

**Critères d'acceptation :**
- [ ] Clic sur l'icône ✎ ou double-clic sur le titre → panneau d'édition latéral (sans modal)
- [ ] Champs modifiables : titre, contenu (textarea), notes internes (non projetées)
- [ ] Aperçu temps réel de la diapositive lors de l'édition
- [ ] Sauvegarde automatique à la perte de focus
- [ ] Annulation possible (Ctrl+Z) si l'utilisateur n'a pas changé de focus

**Priorité :** P1 · **Complexité :** S

---

### US-024 : Supprimer un élément du plan
**En tant que** coordinatrice
**Je veux** supprimer un élément du plan
**Afin de** garder le déroulé propre

**Critères d'acceptation :**
- [ ] Bouton ✕ visible au survol de chaque item
- [ ] En mode Préparation : confirmation légère (tooltip « Cliquer à nouveau pour confirmer »), pas de modal
- [ ] En mode Direct : suppression désactivée (ou requiert confirmation explicite)
- [ ] Ctrl+Z annule la suppression pendant 10 secondes
- [ ] L'item supprimé disparaît avec une animation de collapse

**Priorité :** P1 · **Complexité :** XS

---

### US-025 : Dupliquer un plan existant
**En tant que** coordinatrice
**Je veux** copier un plan d'une semaine précédente comme point de départ
**Afin de** gagner du temps quand le service suit le même schéma

**Critères d'acceptation :**
- [ ] Menu contextuel sur un plan : « Dupliquer »
- [ ] Saisie de la nouvelle date
- [ ] Tous les éléments sont copiés dans le même ordre
- [ ] Les médias (images/PDF) sont liés, pas copiés
- [ ] Le nouveau plan s'ouvre immédiatement après duplication

**Priorité :** P2 · **Complexité :** S

---

### US-026 : Aperçu complet du plan
**En tant qu'** opérateur
**Je veux** voir un résumé visuel de tous les éléments du plan
**Afin de** vérifier que tout est prêt avant le service

**Critères d'acceptation :**
- [ ] Vue « Aperçu du service » accessible depuis le plan : liste compacte avec icônes, titres, durée estimée
- [ ] Durée totale estimée du service visible (somme des minuteries + temps moyen par slide)
- [ ] Indicateurs visuels : ✓ prêt, ⚠ contenu manquant, ✗ média introuvable
- [ ] Export PDF ou copie texte de la liste pour partage avec l'équipe

**Priorité :** P2 · **Complexité :** M

---

### US-027 : Notes d'opérateur
**En tant qu'** opérateur
**Je veux** ajouter des notes privées à chaque élément du plan
**Afin de** me rappeler des indications techniques (ex. : « transition lente », « attendre signe du pasteur »)

**Critères d'acceptation :**
- [ ] Champ notes optionnel sur chaque élément (non projeté, visible seulement en régie)
- [ ] Les notes s'affichent en mode Direct dans le panneau de plan
- [ ] Icône 📝 indique qu'une note est présente sur un item
- [ ] Formatage simple : texte brut, pas de markdown

**Priorité :** P3 · **Complexité :** XS

---

## Epic 4 — Bibliothèque de chants

### US-030 : Rechercher un chant
**En tant qu'** opérateur
**Je veux** trouver un chant en tapant quelques mots
**Afin d'** accéder rapidement au bon chant même en live

**Critères d'acceptation :**
- [ ] Barre de recherche principale visible en haut du panneau Chants
- [ ] Recherche en temps réel (debounce 150ms) sur : titre, artiste, premières paroles de chaque bloc
- [ ] Résultats ordonnés par pertinence (titre exact > titre partiel > paroles)
- [ ] Affichage du snippet de paroles qui correspond à la recherche (surligné en jaune)
- [ ] Recherche vide = tous les chants, triés par utilisation récente puis alphabétique

**Priorité :** P1 · **Complexité :** S

---

### US-031 : Créer un chant
**En tant que** coordinatrice
**Je veux** créer un nouveau chant avec ses sections
**Afin d'** alimenter la bibliothèque

**Critères d'acceptation :**
- [ ] Bouton « + Nouveau chant » dans la bibliothèque
- [ ] Formulaire : titre (obligatoire), artiste, album, année, tonalité
- [ ] Éditeur de blocs : Couplet 1, Couplet 2, Refrain, Pont, Intro, Outro, Tag
- [ ] Chaque bloc a un type, un titre optionnel, et le texte des paroles
- [ ] Aperçu live du rendu slide à droite de l'éditeur
- [ ] Sauvegarde auto à chaque modification (sans bouton Enregistrer)

**Priorité :** P1 · **Complexité :** M

---

### US-032 : Importer un chant depuis Word
**En tant que** coordinatrice
**Je veux** importer un fichier Word contenant les paroles d'un chant
**Afin de** ne pas re-saisir les paroles à la main

**Critères d'acceptation :**
- [ ] Bouton « Importer Word » dans la bibliothèque ET dans le panneau Chants
- [ ] Sélecteur de fichier système (ou glisser-déposer un .docx)
- [ ] Auto-détection des sections : lignes en majuscule ou en gras → titre de section, reste → paroles
- [ ] Éditeur affiché pour validation avant sauvegarde (l'import n'est pas automatiquement sauvegardé)
- [ ] Si le titre du fichier Word correspond à un chant existant : proposer fusion ou remplacement

**Priorité :** P1 · **Complexité :** M

---

### US-033 : Éditer un chant
**En tant que** coordinatrice
**Je veux** modifier les paroles ou la structure d'un chant existant
**Afin de** corriger une erreur ou adapter à l'arrangement local

**Critères d'acceptation :**
- [ ] Éditeur accessible depuis la bibliothèque et depuis le plan (clic sur un item chant)
- [ ] Modification inline des paroles (textarea auto-resize)
- [ ] Drag & drop pour réordonner les blocs
- [ ] Prévisualisation du slide en temps réel (panel slide à droite)
- [ ] Historique d'annulation dans l'éditeur (Ctrl+Z, 20 étapes)
- [ ] Touche Escape pour annuler les modifications non sauvegardées (avec confirmation si modifications)

**Priorité :** P1 · **Complexité :** M

---

### US-034 : Ajouter un bloc de chant au plan
**En tant qu'** opérateur
**Je veux** ajouter spécifiquement le Refrain ou un Couplet d'un chant au plan
**Afin de** construire la séquence exacte de la louange

**Critères d'acceptation :**
- [ ] Dans le panneau Chants, clic sur un chant l'expand → liste de ses blocs
- [ ] Bouton + à côté de chaque bloc pour l'ajouter individuellement au plan
- [ ] Bouton « Tout ajouter » pour ajouter tous les blocs dans l'ordre
- [ ] Drag & drop d'un bloc depuis le panneau vers une position précise dans le plan
- [ ] En glissant un bloc, un guide de position apparaît entre les items du plan

**Priorité :** P1 · **Complexité :** S

---

### US-035 : Favoris et chants fréquents
**En tant que** coordinatrice
**Je veux** marquer mes chants les plus utilisés comme favoris
**Afin de** les retrouver encore plus vite

**Critères d'acceptation :**
- [ ] Icône ♡ sur chaque chant dans la liste, clic pour marquer/démarquer favori
- [ ] Filtre « Favoris » en haut de la liste des chants
- [ ] Les favoris apparaissent en premier dans les résultats de recherche
- [ ] Indicateur de fréquence d'utilisation (ex. « Utilisé 12 fois »)

**Priorité :** P3 · **Complexité :** XS

---

## Epic 5 — Bible

### US-040 : Naviguer dans la Bible
**En tant qu'** opérateur
**Je veux** sélectionner un livre, un chapitre et des versets
**Afin de** trouver le passage à projeter

**Critères d'acceptation :**
- [ ] Sélecteur de livre (dropdown ou grille alphabétique) → sélecteur de chapitre → liste de versets
- [ ] Grille de chapitres : max 3-4 rangées visibles, défilement si plus (résoud le bug actuel des gros livres)
- [ ] Sélection multiple de versets par clic (toggle) ou Shift+clic pour sélection en bloc
- [ ] Bouton « Tout sélectionner / Tout désélectionner » pour le chapitre
- [ ] Aperçu du texte sélectionné en bas du panneau (rendu slide réel)

**Priorité :** P1 · **Complexité :** M

---

### US-041 : Rechercher un verset par texte
**En tant qu'** opérateur
**Je veux** rechercher un passage en tapant des mots-clés
**Afin de** trouver rapidement un verset dont je me souviens partiellement

**Critères d'acceptation :**
- [ ] Barre de recherche textuelle dans le panneau Bible
- [ ] Recherche locale sur la traduction FRLSG (hors ligne, résultats immédiats)
- [ ] Résultats : référence (Jean 3:16) + extrait du texte correspondant
- [ ] Clic sur un résultat → navigation directe vers ce verset (livre + chapitre sélectionnés, verset mis en évidence)
- [ ] Indicateur si la recherche réseau est aussi disponible (pour d'autres traductions)

**Priorité :** P1 · **Complexité :** M

---

### US-042 : Rechercher par référence directe
**En tant qu'** opérateur
**Je veux** taper directement « Jean 3:16 » pour naviguer au passage
**Afin d'** accéder encore plus vite à une référence connue

**Critères d'acceptation :**
- [ ] La barre de recherche accepte le format « Livre Chapitre:Verset[-Verset2] » (ex. : « Ps 23:1-6 »)
- [ ] Auto-complétion du nom du livre (3 lettres minimum → suggestions)
- [ ] Navigation immédiate à la référence si le format est reconnu
- [ ] Gestion des abréviations courantes (Mt, Mc, Lc, Jn, Rm, 1Co, etc.)

**Priorité :** P2 · **Complexité :** M

---

### US-043 : Choisir la traduction
**En tant qu'** opérateur
**Je veux** sélectionner la traduction biblique à utiliser
**Afin d'** afficher la version adaptée à mon église

**Critères d'acceptation :**
- [ ] Sélecteur de traduction en haut du panneau Bible
- [ ] FRLSG (LSG 1910) toujours disponible sans connexion (marqué « hors-ligne »)
- [ ] Autres traductions via API si connexion disponible (marquées « en ligne »)
- [ ] La traduction sélectionnée est mémorisée entre sessions
- [ ] Indicateur de disponibilité (✓ disponible / ⚠ requiert réseau)

**Priorité :** P1 · **Complexité :** XS

---

### US-044 : Ajouter un passage au plan
**En tant qu'** opérateur
**Je veux** ajouter le passage sélectionné au plan en un clic
**Afin de** l'intégrer rapidement au déroulé

**Critères d'acceptation :**
- [ ] Bouton « + Ajouter au plan » visible en permanence (bas du panneau), actif dès qu'au moins 1 verset est sélectionné
- [ ] Mode Passage : tous les versets en une seule diapositive
- [ ] Mode Versets : un slide par verset sélectionné
- [ ] Sélecteur de mode Passage/Versets toujours visible, mémorisé entre sessions
- [ ] Après ajout : confirmation visuelle (flash vert sur le bouton), le panneau reste ouvert

**Priorité :** P1 · **Complexité :** XS

---

## Epic 6 — Annonces & Médias

### US-050 : Créer une annonce texte
**En tant que** coordinatrice
**Je veux** rédiger une annonce textuelle à projeter
**Afin d'** informer la congrégation

**Critères d'acceptation :**
- [ ] Formulaire simple : titre + corps de texte (textarea multi-lignes)
- [ ] Aperçu du rendu slide en temps réel
- [ ] Compteur de caractères avec avertissement si texte trop long pour un slide
- [ ] Suggestion de découpe si texte > limite : « Diviser en 2 slides ? »

**Priorité :** P2 · **Complexité :** S

---

### US-051 : Importer une image ou un PDF
**En tant que** coordinatrice
**Je veux** ajouter une image ou un PDF au plan
**Afin de** projeter des visuels (affiches événements, supports)

**Critères d'acceptation :**
- [ ] Glisser-déposer un fichier image (.jpg, .png, .webp) ou PDF directement dans le plan
- [ ] OU bouton « + Média » dans le panneau Médias avec sélecteur de fichier système
- [ ] Le fichier est copié dans `userData/media/` (pas de dépendance au chemin d'origine)
- [ ] Miniature prévisualisée dans le plan et dans le panneau
- [ ] Pour les PDF multi-pages : sélecteur de page(s) à projeter

**Priorité :** P2 · **Complexité :** M

---

## Epic 7 — Minuterie

### US-060 : Configurer et ajouter une minuterie
**En tant qu'** opérateur
**Je veux** ajouter un compte à rebours dans le plan
**Afin de** gérer les pauses ou transitions chronométrées

**Critères d'acceptation :**
- [ ] Formulaire : durée (mm:ss), titre optionnel (ex. : « Pause café »), alerte sonore optionnelle
- [ ] La minuterie s'affiche en plein écran sur la projection avec le compte à rebours
- [ ] À 0 : clignotement rouge pendant 3 secondes, puis écran noir
- [ ] En mode Direct, le panneau de contrôle affiche la minuterie en cours avec son état (en cours / en pause / terminée)
- [ ] Boutons en mode Direct : ▶ Démarrer / ⏸ Pause / ⟳ Réinitialiser (sans affecter la projection principale)

**Priorité :** P2 · **Complexité :** M

---

## Epic 8 — Contrôle de projection (Mode Direct)

### US-070 : Passer en mode Direct
**En tant qu'** opérateur
**Je veux** basculer en mode Direct pour commencer le service
**Afin d'** avoir l'interface optimisée pour le contrôle en live

**Critères d'acceptation :**
- [ ] Bouton « ▶ DIRECT » bien visible dans la barre de titre (fond vert, icône)
- [ ] Raccourci clavier : Ctrl+P
- [ ] Transition animée vers l'interface sombre (300ms)
- [ ] Le premier élément du plan est pré-chargé mais pas encore projeté (attente manuelle)
- [ ] Indicateur « DIRECT » pulsant en rouge/vert visible en permanence

**Priorité :** P1 · **Complexité :** S

---

### US-071 : Naviguer entre les éléments en live
**En tant qu'** opérateur
**Je veux** avancer et reculer entre les éléments du plan
**Afin de** suivre le déroulé du service

**Critères d'acceptation :**
- [ ] Touche → ou Espace → élément suivant
- [ ] Touche ← → élément précédent
- [ ] Boutons ◀ et ▶ visibles et larges (min 200px chacun) pour la souris
- [ ] Raccourcis alternatifs : D/d (suivant), Q/q (précédent)
- [ ] Feedback immédiat : l'aperçu se met à jour en < 50ms
- [ ] Si dernier élément et pression Espace : vibration visuelle + message « Fin du plan »
- [ ] Navigation au sein d'un même chant (bloc suivant) avant de passer au prochain élément du plan

**Priorité :** P1 · **Complexité :** S

---

### US-072 : Aperçu courant + suivant
**En tant qu'** opérateur
**Je veux** voir simultanément ce qui est projeté et ce qui vient ensuite
**Afin de** ne jamais être pris par surprise

**Critères d'acceptation :**
- [ ] **Zone COURANT** : aperçu large (≥ 60% de la largeur), rendu réel du slide projeté
- [ ] **Zone SUIVANT** : aperçu compact (≥ 30% de la largeur), légèrement moins lumineux
- [ ] Les deux zones montrent le contenu exact (titre + corps) tel qu'il apparaît sur l'écran de projection
- [ ] Le titre de l'élément (chant, référence biblique) est affiché au-dessus de l'aperçu
- [ ] Si l'écran est en mode NOIR ou BLANC : les aperçus l'indiquent clairement (overlay noir/blanc sur les zones)

**Priorité :** P1 · **Complexité :** M

---

### US-073 : Mettre l'écran en noir ou blanc
**En tant qu'** opérateur
**Je veux** basculer instantanément l'écran de projection en noir ou blanc
**Afin de** gérer les transitions ou masquer le contenu temporairement

**Critères d'acceptation :**
- [ ] Touche B → noir, Touche W → blanc
- [ ] R → reprendre la projection normale
- [ ] Boutons ⬛ NOIR et ⬜ BLANC dans la barre de contrôle Live, visuellement actifs quand activés
- [ ] L'état (NOIR / BLANC / NORMAL) est clairement indiqué dans l'interface
- [ ] Ces raccourcis fonctionnent depuis n'importe quelle fenêtre (pas seulement la fenêtre principale)

**Priorité :** P1 · **Complexité :** XS

---

### US-074 : Sélectionner l'écran cible
**En tant qu'** opérateur
**Je veux** choisir sur quel écran (A, B, ou C) envoyer le contenu
**Afin de** gérer les projections multi-zones

**Critères d'acceptation :**
- [ ] Sélecteur d'écran A / B / C visible en permanence en mode Direct
- [ ] Raccourcis : 1 → écran A, 2 → écran B, 3 → écran C
- [ ] Indicateur d'état de chaque écran : vert = connecté, orange = veille, rouge = déconnecté
- [ ] Indicateur de contenu : miniature du contenu actuel projeté sur chaque écran
- [ ] Possibilité de verrouiller un écran sur son contenu (L pour lock) : l'écran ignore les commandes de navigation jusqu'au déverrouillage

**Priorité :** P1 · **Complexité :** S

---

### US-075 : Accès direct à un élément du plan en live
**En tant qu'** opérateur
**Je veux** cliquer directement sur n'importe quel élément du plan pour le projeter
**Afin de** réagir rapidement aux changements imprévus

**Critères d'acceptation :**
- [ ] Panneau de plan scrollable visible en mode Direct (liste compacte)
- [ ] Clic sur un item → projection immédiate
- [ ] L'item courant est mis en évidence (fond coloré, indicateur ●)
- [ ] La liste défile automatiquement pour garder l'item courant visible
- [ ] Clic non accidentel : léger délai (200ms) ou double-clic pour sauter à un item non-adjacent

**Priorité :** P1 · **Complexité :** S

---

### US-076 : Projection rapide d'un texte libre
**En tant qu'** opérateur
**Je veux** projeter un texte saisi à la volée sans l'ajouter au plan
**Afin de** réagir en < 5 secondes à une demande imprévue

**Critères d'acceptation :**
- [ ] Bouton « ✏ Texte libre » dans la barre de contrôle Live
- [ ] Raccourci : Ctrl+T
- [ ] Popover compact : textarea + aperçu + bouton Projeter
- [ ] Le texte est projeté immédiatement (Ctrl+Entrée)
- [ ] L'item n'est pas ajouté au plan (éphémère)
- [ ] Option d'ajouter au plan si on le souhaite

**Priorité :** P2 · **Complexité :** S

---

### US-077 : Indicateur de progression
**En tant qu'** opérateur
**Je veux** voir où j'en suis dans le plan en live
**Afin de** gérer le temps et anticiper la suite

**Critères d'acceptation :**
- [ ] Compteur « X / N éléments » visible en mode Direct
- [ ] Barre de progression linéaire (ne pas afficher un % — trop anxiogène)
- [ ] Durée écoulée depuis le début du mode Direct (chronomètre)
- [ ] Durée restante estimée (si des minuteries sont présentes dans le plan)

**Priorité :** P2 · **Complexité :** S

---

### US-078 : Quitter le mode Direct
**En tant qu'** opérateur
**Je veux** sortir du mode Direct proprement
**Afin de** revenir en mode Préparation si besoin

**Critères d'acceptation :**
- [ ] Bouton « ✕ Quitter Direct » dans la barre de contrôle
- [ ] Raccourci : Ctrl+P (toggle)
- [ ] Confirmation légère si service en cours (« Terminer la projection ? »)
- [ ] La projection sur les écrans est maintenue jusqu'à action explicite (pas d'écran noir automatique)
- [ ] Transition douce vers le mode Préparation

**Priorité :** P1 · **Complexité :** S

---

## Epic 9 — Apparence de la projection

### US-080 : Personnaliser les couleurs
**En tant que** coordinatrice
**Je veux** choisir les couleurs de fond et de texte de la projection
**Afin d'** adapter l'apparence à la charte graphique de mon église

**Critères d'acceptation :**
- [ ] Panneau Apparence dans les Paramètres (non dans le flux Live)
- [ ] Sélecteurs : couleur de fond, couleur de texte, couleur du titre
- [ ] Fond : couleur unie OU gradient (2 couleurs + direction) OU image de fond
- [ ] Aperçu en temps réel du slide avec le texte « Titre exemple / Corps de texte exemple »
- [ ] Bouton « Appliquer aux écrans » sans quitter le panneau

**Priorité :** P2 · **Complexité :** M

---

### US-081 : Choisir la police et la taille du texte
**En tant que** coordinatrice
**Je veux** choisir la police et la taille du texte projeté
**Afin de** garantir une lisibilité optimale en salle

**Critères d'acceptation :**
- [ ] Sélecteur de police (liste des polices système + polices embarquées : Inter, Roboto, Open Sans)
- [ ] Curseur de taille (50%–200% par rapport à la taille par défaut)
- [ ] Hauteur de ligne et espacement des lettres ajustables
- [ ] Aperçu de la police avec un vrai texte de chant ou de verset
- [ ] Bouton « Réinitialiser » pour revenir aux valeurs par défaut

**Priorité :** P2 · **Complexité :** S

---

### US-082 : Ajouter un logo ou un bandeau
**En tant que** coordinatrice
**Je veux** afficher le logo de mon église dans un coin de la projection
**Afin de** maintenir l'identité visuelle pendant le service

**Critères d'acceptation :**
- [ ] Upload d'image (PNG avec transparence recommandé)
- [ ] Sélection de la position : 4 coins + centré bas
- [ ] Taille réglable (10%–40% de la largeur de l'écran)
- [ ] Opacité réglable (20%–100%)
- [ ] Option masquer le logo pour certains types d'éléments (ex. : minuterie)

**Priorité :** P3 · **Complexité :** S

---

## Epic 10 — Import / Export

### US-090 : Exporter les données
**En tant que** coordinatrice
**Je veux** exporter mes chants et plans
**Afin de** sauvegarder mes données ou partager avec un autre poste

**Critères d'acceptation :**
- [ ] Export JSON compressé (ZIP) de toute la bibliothèque de chants
- [ ] Export d'un plan spécifique en JSON
- [ ] Option d'export complet (chants + plans + paramètres)
- [ ] Dialogue de sauvegarde système pour choisir l'emplacement
- [ ] Confirmation avec résumé : « 45 chants, 12 plans exportés »

**Priorité :** P2 · **Complexité :** S

---

### US-091 : Importer des données
**En tant que** coordinatrice
**Je veux** importer des données depuis un fichier d'export
**Afin de** restaurer une sauvegarde ou récupérer le travail d'un collègue

**Critères d'acceptation :**
- [ ] Import depuis fichier ZIP ou JSON
- [ ] Modes : MERGE (ajouter aux données existantes) ou REPLACE (remplacer)
- [ ] Rapport préalable : « X chants seront ajoutés, Y existants seront mis à jour, Z plans seront importés »
- [ ] Confirmation avant l'import en mode REPLACE
- [ ] Rollback automatique si l'import échoue à mi-chemin

**Priorité :** P2 · **Complexité :** M

---

## Epic 11 — Paramètres

### US-100 : Configurer les raccourcis clavier
**En tant qu'** opérateur
**Je veux** personnaliser les raccourcis clavier de navigation
**Afin d'** adapter l'application à mon matériel (pédalier, clavier MIDI, etc.)

**Critères d'acceptation :**
- [ ] Page Paramètres > Raccourcis : liste de toutes les actions avec leur raccourci actuel
- [ ] Clic sur un raccourci → mode d'écoute (« Appuyez sur la touche... »)
- [ ] Validation : alerte si conflit avec un raccourci système ou existant
- [ ] Plusieurs touches peuvent être assignées à la même action
- [ ] Bouton « Réinitialiser » par action et « Réinitialiser tout »
- [ ] Export/import des raccourcis pour partage entre postes

**Priorité :** P2 · **Complexité :** M

---

### US-101 : Configurer les écrans de projection
**En tant qu'** opérateur
**Je veux** assigner les écrans A/B/C aux moniteurs physiques
**Afin de** contrôler quelle sortie vidéo reçoit quel contenu

**Critères d'acceptation :**
- [ ] Liste des moniteurs détectés avec leur résolution
- [ ] Attribution drag & drop ou sélection dropdown pour assigner A, B, C
- [ ] Bouton « Tester » qui affiche brièvement un identifiant sur chaque écran
- [ ] Configuration du miroir : B = miroir de A, C = miroir de A, ou indépendant
- [ ] La configuration est mémorisée et restaurée automatiquement au prochain lancement

**Priorité :** P1 · **Complexité :** M

---

### US-102 : Overlay de raccourcis
**En tant qu'** opérateur
**Je veux** afficher la liste des raccourcis disponibles
**Afin de** les consulter sans chercher dans les paramètres

**Critères d'acceptation :**
- [ ] Touche ? ou F1 affiche un overlay plein écran avec tous les raccourcis actifs
- [ ] L'overlay se ferme avec Escape ou un clic
- [ ] Les raccourcis sont groupés par contexte (navigation, écrans, utilitaires)
- [ ] Disponible dans les deux modes (Préparation et Direct)

**Priorité :** P2 · **Complexité :** XS

---

## Backlog de valeur ajoutée (P3 / Futures itérations)

| ID | Titre | Description courte |
|---|---|---|
| US-110 | Mode de présentation simplifié | Interface ultra-épurée pour David (Persona 3) |
| US-111 | Synchronisation réseau pilotage distant | Contrôle depuis un second appareil sur le même réseau |
| US-112 | Modèles de plans | Plans pré-remplis (Culte classique, Jeunes, etc.) |
| US-113 | Historique des projections | Replay de ce qui a été projeté pendant un service |
| US-114 | Auto-avance | Défilement automatique avec intervalle configurable |
| US-115 | Statistiques | Fréquence d'utilisation des chants, durée des services |
| US-116 | Chants favoris par plan | Marquer les chants utilisés régulièrement ensemble |
| US-117 | Boucle de projection | Répéter un élément en boucle (musique d'accueil) |
| US-118 | Sous-titres / Traduction | Affichage bilingue sur les slides |
| US-119 | Thèmes saisonniers | Palettes de couleurs prédéfinies (Noël, Pâques, etc.) |

---

*Légende des priorités :*
- **P1** — Bloquant pour une utilisation en production le dimanche
- **P2** — Améliore significativement l'expérience
- **P3** — Valeur ajoutée, pas bloquant
