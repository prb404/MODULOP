# Brief produit — Atelier de profils modulaires

## 1. Vision

Créer une application web locale, marque blanche, visuellement remarquable,
permettant de construire, explorer et transporter des **profils modulaires
interactifs**.

Un profil peut mélanger :

- starter pack personnel ;
- portrait psychologique ou projectif ;
- préférences, goûts, valeurs et habitudes ;
- questionnaires et auto-évaluations ;
- petits défis cognitifs ;
- compétences, expériences et réalisations ;
- objets, médias, citations et collections ;
- statistiques et visualisations ;
- éléments libres définis par de futurs modules.

L'application n'impose ni le CV comme finalité, ni un récit personnel unique.
Elle fournit un **gestionnaire et un moteur de profil générique**. Les modules
installés déterminent ensuite ce que ce moteur peut devenir : outil de
présentation, capsule personnelle, expérience de découverte de soi, dossier
professionnel, jeu social ou support spécialisé.

## 2. Positionnement

Le produit se situe à l'intersection de quatre familles :

1. un constructeur de dashboard personnel ;
2. un starter pack interactif ;
3. un moteur de questionnaires et de scoring ;
4. un format portable de profil.

La priorité d'expérience est toutefois :

> Faire découvrir une personne à travers des éléments manipulables, visuels,
> surprenants et contextualisés, plutôt que reproduire un CV sous forme de
> cartes.

Le CV est un usage possible. Il ne doit pas dicter l'interface ni les modules
par défaut.

## 3. Principes structurants

### Local-first réel

- aucune authentification ;
- aucun backend obligatoire ;
- aucune base de données distante ;
- aucune télémétrie par défaut ;
- données et médias conservés dans le navigateur ;
- fonctionnement hors ligne après chargement de l'application ;
- import et export complets ;
- déploiement possible comme site statique.

### Marque blanche

- aucun nom de produit visible dans le profil publié ;
- aucun logo imposé ;
- identité visuelle configurable ;
- interface d'administration neutre ;
- métadonnées de marque facultatives dans les exports ;
- thèmes séparés du contenu.

### Puissance progressive

La première utilisation doit être simple. La profondeur technique apparaît
seulement quand elle devient utile :

- ajouter un module ;
- le compléter ;
- choisir son apparence ;
- le placer ;
- publier.

Les schémas, règles de scoring, migrations et capacités restent des concepts
internes ou réservés au mode développeur.

### Liberté encadrée

La grille est conservée, mais le produit doit empêcher les mauvais résultats :

- grille responsive à positions discrètes ;
- tailles recommandées par rendu ;
- compositions automatiques ;
- alignement et rééquilibrage ;
- verrouillage facultatif du layout ;
- aperçu mobile et impression ;
- avertissement si une composition devient illisible.

### Honnêteté des résultats

Une visualisation spectaculaire ne transforme pas un questionnaire en mesure
scientifique. Chaque module d'évaluation annonce clairement son statut, sa
source, sa méthode et ses limites.

## 4. Les deux modes principaux

### Mode Composer

L'espace de travail principal :

- canevas en grille ;
- ajout, déplacement et redimensionnement des modules ;
- panneau contextuel d'édition ;
- bibliothèque de modules ;
- changement de rendu ;
- réglages de thème ;
- prévisualisations desktop, mobile et impression ;
- historique local ;
- import et export.

### Mode Explorer

La version destinée à être consultée :

- aucune interface d'administration ;
- modules interactifs lorsque pertinent ;
- détails révélés progressivement ;
- navigation clavier et tactile ;
- mise en page stable ;
- partage sous forme de capsule autonome ;
- impression propre.

Le mode Explorer ne doit pas ressembler à un back-office désactivé. C'est un
rendu à part entière.

## 5. Anatomie d'un profil

Un profil contient :

- son identité facultative ;
- ses métadonnées ;
- les instances de modules ;
- leurs données ;
- leurs résultats calculés ;
- le layout par breakpoint ;
- le thème ;
- les médias locaux ;
- les règles de visibilité ;
- l'historique de versions utile ;
- les informations de compatibilité.

Un profil ne dépend pas de l'installation qui l'a créé. Son export doit être
auto-descriptif et migrable.

## 6. Anatomie d'un module

Un module est un paquet déclaratif versionné comprenant :

- manifeste ;
- schéma des données ;
- définition de formulaire ou de questionnaire ;
- règles de validation ;
- règles de calcul ;
- rendus disponibles ;
- tailles autorisées et recommandées ;
- comportement responsive ;
- comportement d'impression ;
- textes d'aide et d'interprétation ;
- provenance et licence ;
- niveau de preuve ;
- éventuelles migrations.

Un module ne doit pas pouvoir exécuter arbitrairement du JavaScript provenant
d'un fichier importé. Les paquets de données choisissent parmi des capacités et
des rendus connus du moteur.

## 7. Familles de modules

### Expression

Contenus saisis ou composés librement :

- identité ;
- bio fragmentée ;
- citation ;
- manifeste ;
- portrait chinois ;
- « jamais sans » ;
- contradictions ;
- valeurs ;
- règles personnelles ;
- goûts classés ;
- humeur ou énergie du moment.

### Collection

Ensembles d'éléments visuels :

- objets du starter pack ;
- livres, films, musiques ou outils ;
- inspirations ;
- galerie ;
- lieux ;
- personnes marquantes ;
- badges ;
- cartes à collectionner.

### Parcours et preuves

- moments ;
- expériences ;
- projets ;
- accomplissements ;
- apprentissages ;
- documents ou médias associés ;
- liens entre une affirmation et ses preuves.

### Mesure et auto-évaluation

- échelle de Likert ;
- QCM ou QCx ;
- classement forcé ;
- comparaison par paires ;
- matrice ;
- curseurs ;
- journal longitudinal ;
- scores simples ou multidimensionnels.

### Jeu et cognition

- suites logiques ;
- analogies ;
- rotation mentale ;
- mémoire courte ;
- vitesse de réaction ;
- association sémantique ;
- scénarios et choix.

Ces modules doivent être décrits comme jeux, exercices ou indicateurs locaux
tant qu'ils ne disposent pas d'une validation psychométrique appropriée.

### Données calculées

- synthèse ;
- statistiques ;
- corrélations descriptives ;
- évolution temporelle ;
- comparaison entre deux passations ;
- agrégation de résultats provenant de plusieurs modules.

## 8. Niveau de preuve

Chaque module d'évaluation déclare un `evidenceLevel`.

### `playful`

Expérience ludique ou projective, sans prétention de mesure.

Exemples : portrait chinois, starter pack, archétypes narratifs.

### `exploratory`

Cadre théorique ou questionnaire maison utile pour réfléchir, mais sans score
diagnostique ni normes.

Exemple : exploration des domaines inspirés des intelligences multiples. Le
résultat doit parler d'**affinités déclarées** ou de **modes d'engagement**, pas
d'un quotient d'intelligence.

### `research-informed`

Module construit à partir d'une méthode ou d'une littérature identifiée, mais
dont l'implémentation locale n'est pas une évaluation clinique ou certifiée.

Exemple : questionnaire d'efficacité personnelle contextualisé, documentant
ses items, son échelle, son mode de calcul et ses limites.

### `validated`

Reproduction autorisée d'un instrument validé, avec version, population,
langue, conditions d'administration, fidélité, validité, règles de calcul et
licence documentées.

Ce statut ne doit pas être attribué automatiquement parce qu'un module cite un
auteur connu.

### `professional-only`

Instrument dont l'usage, l'interprétation ou la diffusion exige un
professionnel, une licence ou des conditions contrôlées. Le moteur sait
l'identifier, mais le catalogue public ne l'embarque pas par défaut.

## 9. Bibliothèque de démonstration

La démo doit montrer des mécanismes différents, pas dix variantes d'une carte.

### 1. Starter Pack vivant

**But :** incarner immédiatement le cœur ludique du produit.

- objets avec image, nom et commentaire ;
- regroupements libres ;
- importance et visibilité ;
- modes mosaïque, étagère, constellation et cartes ;
- ouverture d'un objet en détail ;
- aucune notation psychométrique.

### 2. Portrait chinois

**But :** démontrer questions ouvertes, médias et composition projective.

- « Si j'étais un lieu… » ;
- « Si j'étais une matière… » ;
- « Si j'étais une époque… » ;
- réponse courte, justification et image facultative ;
- rendus cartes, récit défilant et collage.

Statut : `playful`.

### 3. Efficacité personnelle contextualisée

**But :** démontrer une échelle sérieuse et multidimensionnelle.

Il ne faut pas fabriquer un pourcentage universel « à la Bandura ». Le module
demande d'abord un domaine précis : apprendre, créer, prendre la parole,
résoudre un problème, chercher un emploi, etc. Les items mesurent ensuite le
degré de confiance à réussir des actions de difficulté croissante dans ce
contexte.

- échelle de confiance explicite ;
- items ordonnés par difficulté ;
- score global descriptif ;
- profil par sous-dimension si justifié ;
- comparaison entre passations ;
- contexte et date toujours visibles ;
- aucune interprétation clinique.

Statut initial : `research-informed`. Il ne devient `validated` qu'avec un
instrument précis, une traduction et des droits documentés.

### 4. Cartographie des domaines d'engagement

**But :** exploiter l'intuition attrayante de Gardner sans faux diagnostic.

- situations et préférences concrètes ;
- domaines linguistique, logique, spatial, musical, corporel, interpersonnel,
  intrapersonnel et naturaliste ;
- résultat présenté comme une cartographie de préférences et d'activités ;
- possibilité de joindre des preuves ou exemples ;
- aucun classement de l'intelligence ;
- aucun conseil scolaire déterministe.

Statut : `exploratory`.

### 5. Défis cognitifs

**But :** démontrer timers, réponses exactes, niveaux, randomisation et scoring.

- séries logiques ;
- matrices visuelles originales ;
- analogies ;
- mémoire de travail courte ;
- rotation mentale.

Le module restitue précision, temps et progression à l'intérieur du jeu. Il ne
produit pas de « QI », car une passation courte, non supervisée et non normée ne
permet pas cette conclusion.

Statut : `playful` ou `exploratory`.

### 6. Valeurs en tension

**But :** démontrer classement forcé, comparaisons par paires et arbitrages.

- choix entre deux valeurs également désirables ;
- résultat sous forme de tensions, pas de bonnes ou mauvaises réponses ;
- rendus boussole, matrice et cartes ;
- explication accessible du calcul.

Statut : `exploratory`.

### 7. Mode d'emploi relationnel

**But :** produire un module immédiatement utile dans un profil.

- « Pour bien travailler avec moi » ;
- « Ce qui me donne de l'énergie » ;
- « Ce qui me bloque » ;
- « Comment me faire un retour » ;
- visibilité publique ou privée par item ;
- rendu éditorial, cartes ou fiche imprimable.

Statut : `playful`, car il s'agit d'auto-description.

### 8. Chronique personnelle

**But :** tester médias, temporalité, liens et impression.

- événements ;
- bifurcations ;
- apprentissages ;
- preuves associées ;
- modes timeline, chapitres et carte.

Ce module peut accueillir du contenu personnel ou professionnel sans ramener le
produit au CV.

## 10. Moteur de questionnaire

Le moteur doit gérer :

- page d'introduction et consentement informé ;
- sections ;
- QCM à réponse unique ;
- QCx à réponses multiples ;
- Likert ;
- échelle numérique ;
- classement ;
- comparaison par paires ;
- saisie libre ;
- réponse média ;
- chronométrage facultatif ;
- randomisation contrôlée ;
- embranchements conditionnels ;
- items inversés ;
- pondérations ;
- sous-scores ;
- données manquantes ;
- seuil minimal de complétion ;
- interprétations ;
- comparaison temporelle ;
- restitution immédiate ou différée.

Les règles sont déclaratives. Les calculs autorisés appartiennent à une petite
bibliothèque d'opérations déterministes et testées. Il faut éviter un langage
de formules arbitraires évalué comme du code.

## 11. Moteur de rendu

Un module expose uniquement les rendus compatibles avec ses données.

Rendus initiaux :

- carte éditoriale ;
- liste et classement ;
- mosaïque média ;
- nuage ou constellation ;
- timeline ;
- barres ;
- barres divergentes ;
- radar, avec avertissement lorsque la comparaison devient trompeuse ;
- anneau ou donut pour une proportion réelle ;
- jauge pour une échelle bornée clairement définie ;
- matrice ;
- distribution ;
- évolution temporelle ;
- fiche imprimable.

Le moteur ne doit pas proposer un donut à n'importe quel score uniquement parce
que la librairie sait le dessiner.

## 12. Interactions

### Desktop

- survol pour révéler des raccourcis non essentiels ;
- clic pour sélectionner et éditer ;
- poignées explicites de déplacement et redimensionnement ;
- menu contextuel ;
- raccourcis clavier ;
- commande universelle.

### Tactile

- actions toujours accessibles sans hover ;
- tap pour sélectionner ;
- poignée de déplacement ;
- feuille inférieure pour les options ;
- tailles de cibles accessibles ;
- aucun long press indispensable.

Le hover améliore l'expérience, mais ne porte jamais une fonctionnalité
exclusive.

## 13. Direction visuelle

Le produit doit éviter le « dashboard violet sur fond bleu nuit » comme unique
identité.

Le système visuel repose sur :

- thèmes éditoriaux réellement distincts ;
- typographie forte ;
- cartes pouvant devenir transparentes, pleines ou sans bord ;
- densité configurable ;
- palettes générées à partir du profil ou choisies manuellement ;
- médias occupant une place importante ;
- animations qui expliquent le changement de vue ou de données ;
- mode réduction des mouvements ;
- contraste accessible ;
- chrome d'édition discret ;
- mise en page Explorer plus expressive que la grille Composer.

Trois thèmes de démonstration :

1. **Editorial** — papier, encre, grands caractères et compositions aérées ;
2. **Signal** — sombre, technique, précis et lumineux ;
3. **Cabinet** — tactile, coloré, collection d'objets et d'étiquettes.

## 14. Import, export et portabilité

### Fichiers

- `.json` pour un profil sans média ;
- `.modulop` ou `.zip` pour un paquet complet ;
- HTML autonome pour une capsule consultable ;
- impression ou PDF via une feuille de style dédiée.

### Contenu d'un paquet

```text
manifest.json
profile.json
modules/
assets/
integrity.json
README.txt
```

### Import sécurisé

- validation du manifeste avant extraction complète ;
- limites de taille, de nombre de fichiers et de profondeur ;
- chemins normalisés ;
- types MIME contrôlés ;
- aucune exécution de script importé ;
- migrations explicites ;
- rapport clair des erreurs et avertissements ;
- aperçu avant fusion ou remplacement.

## 15. Architecture technique cible

Le brief ne doit pas enfermer Codex dans une liste de bibliothèques avant
inspection du besoin. Il fixe les capacités et les frontières.

Socle recommandé :

- application statique construite et empaquetée ;
- JavaScript ou TypeScript en modules ES ;
- composants UI structurés ;
- IndexedDB pour profils, médias et historique ;
- couche de stockage abstraite ;
- worker pour import, export et tâches coûteuses ;
- schémas versionnés ;
- validation aux frontières ;
- moteur de migration ;
- bibliothèque de grille éprouvée ;
- bibliothèque de dataviz éprouvée et chargée à la demande ;
- service worker pour le hors-ligne ;
- tests unitaires des scores et migrations ;
- tests d'intégration des allers-retours import/export ;
- tests visuels des breakpoints et de l'impression.

Les dépendances via CDN peuvent convenir à un prototype, mais une version
portable et hors ligne doit les empaqueter dans le build. Le CDN ne doit pas
être une dépendance d'exécution critique.

## 16. Modèle de données conceptuel

```json
{
  "format": "modular-profile",
  "schemaVersion": 1,
  "profile": {
    "id": "profile-local-001",
    "title": "Profil",
    "themeId": "editorial",
    "createdAt": "2026-06-14T00:00:00Z",
    "updatedAt": "2026-06-14T00:00:00Z"
  },
  "instances": [
    {
      "id": "instance-starter-pack",
      "moduleType": "starter-pack",
      "moduleVersion": "1.0.0",
      "renderer": "shelf",
      "visibility": "public",
      "data": {},
      "result": null
    }
  ],
  "layouts": {
    "wide": [],
    "compact": [],
    "print": []
  },
  "assets": [],
  "history": []
}
```

Les résultats calculés peuvent être mis en cache, mais ils doivent toujours
être reproductibles à partir des réponses, de la version du module et de la
version du moteur de scoring.

## 17. Écrans

### Accueil local

- profils récents ;
- créer ;
- importer ;
- ouvrir une capsule de démonstration ;
- indication claire du stockage local.

### Composer

- grille ;
- bibliothèque ;
- inspecteur ;
- aperçu ;
- historique ;
- publication.

### Passation

- introduction ;
- progression ;
- questionnaire ;
- pause et reprise ;
- contrôle des réponses ;
- résultat ;
- ajout du résultat au profil.

### Bibliothèque

- recherche et catégories ;
- aperçu d'un module ;
- statut scientifique ;
- données demandées ;
- rendus disponibles ;
- licence ;
- installation locale.

### Données et portabilité

- profils et espace utilisé ;
- sauvegardes ;
- import/export ;
- migrations ;
- suppression ;
- diagnostic de compatibilité.

## 18. MVP

### Inclus

- stockage IndexedDB ;
- création et gestion de plusieurs profils ;
- grille responsive ;
- édition en panneau ;
- huit modules de démonstration ;
- moteur de questionnaire couvrant cinq types de questions ;
- six rendus génériques ;
- trois thèmes ;
- import/export JSON et paquet complet ;
- aperçu Explorer ;
- impression ;
- historique local limité ;
- accessibilité clavier et tactile de base.

### Non inclus

- exécution de plugins tiers ;
- marketplace distante ;
- collaboration en temps réel ;
- synchronisation cloud ;
- diagnostic psychologique ;
- véritable score de QI ;
- promesse de révocation d'un export ;
- éditeur universel de modules accessible à tous.

## 19. Démonstration attendue

Le profil préchargé doit faire comprendre la plateforme en moins de trois
minutes :

1. ouverture d'un profil riche et non professionnel ;
2. exploration du starter pack ;
3. passage d'une mosaïque à une constellation ;
4. réponse à quelques questions du portrait chinois ;
5. reprise d'une passation d'efficacité personnelle ;
6. affichage de son contexte et de son niveau de preuve ;
7. exécution d'un défi cognitif sans afficher de faux QI ;
8. déplacement et redimensionnement de modules ;
9. aperçu dans trois thèmes ;
10. export du profil et réimport sans perte.

## 20. Critères de réussite

- le produit évoque d'abord un starter pack interactif, pas un logiciel RH ;
- un profil intéressant peut être créé sans fournir d'informations de CV ;
- les modules semblent appartenir au même moteur malgré des interactions très
  différentes ;
- les résultats indiquent leur origine et leurs limites ;
- le profil reste utilisable au clavier, au tactile et sans animation ;
- l'impression produit une composition intentionnelle ;
- l'application fonctionne sans réseau ;
- un export réimporté restitue données, médias, résultats et layouts ;
- l'ajout d'un nouveau module interne n'exige pas de modifier le cœur ;
- aucune donnée ne quitte l'appareil sans action explicite.

## 21. Formulation synthétique pour Codex

Construire une application statique local-first et marque blanche servant
d'atelier de profils modulaires interactifs. Le produit doit privilégier le
starter pack, l'expression personnelle, les questionnaires, les collections et
les expériences visuelles, tout en permettant des usages de CV ou portfolio.

Le cœur comprend :

- un gestionnaire multi-profils ;
- une grille responsive avec layouts contrôlés ;
- un catalogue de modules déclaratifs ;
- un moteur de formulaires et questionnaires ;
- un moteur de scoring déterministe ;
- un moteur de rendu proposant uniquement des visualisations sémantiquement
  compatibles ;
- une distinction visible entre contenu ludique, exploratoire, informé par la
  recherche et validé ;
- une sauvegarde IndexedDB ;
- un import/export portable et sécurisé ;
- un mode Composer et un mode Explorer ;
- un rendu hors ligne, tactile, accessible et imprimable.

La première version doit prouver l'extensibilité avec huit modules réellement
différents, sans prétendre résoudre immédiatement les plugins tiers, la
collaboration, le cloud ou l'évaluation psychologique professionnelle.

