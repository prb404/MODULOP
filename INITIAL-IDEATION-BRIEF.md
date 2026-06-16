Voici une reformulation plus claire, ambitieuse et exploitable comme **brief produit + brief technique pour Codex**.

# Brief Codex — App “Profile Starter Pack / Modular CV”

## 1. Vision produit

Créer une application web locale, ultra visuelle, moderne et animée permettant de composer un **profil personnel modulaire**, à mi-chemin entre un **starter pack interactif**, un **CV augmenté**, un **dashboard de personnalité** et une **carte d’identité data-driven**.

L’application doit permettre à une personne de représenter qui elle est à travers des modules visuels : textes courts, statistiques, graphiques, scores, tests, badges, expériences, compétences, traits de personnalité, préférences, timeline, valeurs, centres d’intérêt, cartes radar, donuts, matrices, jauges, comparatifs, etc.

L’objectif n’est pas seulement de remplir un CV, mais de créer une **page-profil esthétique, exportable, transportable et imprimable**, construite comme un dashboard personnel entièrement personnalisable.

## 2. Contraintes fondamentales

L’app doit être **local-first**, sans backend obligatoire, sans base de données serveur, sans authentification et sans dépendance à un service externe pour fonctionner.

Elle doit pouvoir tourner :

* en local via un petit serveur statique ;
* sur un hébergement très simple type GitHub Pages, Netlify, Vercel static, serveur Apache/Nginx ;
* idéalement comme une app purement statique générée par Vite, qui produit un bundle déployable sur un hébergement statique. Vite documente explicitement ce mode de build/déploiement statique. ([vitejs][1])

Le stockage doit rester côté navigateur. Pour éviter les limites et rigidités du `localStorage` pur, utiliser une couche de stockage locale simple type **localForage**, qui fournit une API proche de localStorage tout en utilisant IndexedDB lorsque disponible, avec fallback localStorage. ([GitHub][2])

Aucune donnée ne doit quitter le navigateur, sauf action volontaire de l’utilisateur via export `.json`, export `.zip`, impression ou copie.

## 3. Concept central

L’app repose sur trois objets principaux :

### Profil

Un profil est un document JSON autonome contenant :

* les métadonnées du profil ;
* les informations personnelles affichables ;
* la liste des modules activés ;
* les données saisies dans chaque module ;
* le layout de la grille ;
* les préférences visuelles ;
* les scores calculés ;
* les versions de schémas utilisées.

### Module

Un module est un composant autonome décrit par métadonnées JSON :

* type de module ;
* formulaire associé ;
* règles de validation ;
* règles de calcul ;
* rendus possibles ;
* options graphiques ;
* contraintes de taille ;
* comportement responsive ;
* comportement à l’impression.

### Renderer

Un renderer est une manière d’afficher les données d’un module :

* card simple ;
* chart ;
* donut ;
* radar ;
* timeline ;
* gauge ;
* liste ;
* nuage de tags ;
* matrice ;
* scorecard ;
* mini-infographie.

Un même module doit pouvoir avoir plusieurs rendus possibles selon le type de données.

## 4. Fonctionnalités principales

### Vue profil

C’est l’écran principal. Il affiche une grille responsive composée de modules déplaçables et redimensionnables.

La grille doit permettre :

* drag & drop ;
* redimensionnement ;
* ajout rapide de modules ;
* suppression ;
* duplication ;
* changement de rendu ;
* édition inline ou via panneau latéral ;
* sauvegarde automatique locale ;
* rendu propre en responsive ;
* rendu imprimable via `@media print`.

Pour cette partie, utiliser une librairie spécialisée plutôt qu’un système maison. **GridStack.js** est adapté car il vise précisément les dashboards avec widgets déplaçables, redimensionnables et responsives. ([Gridstack.js Official Site][3])

### Panneau de création / édition

Créer un panneau glissant latéral ou bottom sheet responsive.

Ce panneau sert à :

* ajouter un module ;
* choisir un type de module ;
* remplir un formulaire ;
* modifier les données ;
* choisir un mode d’affichage ;
* prévisualiser le rendu ;
* configurer les couleurs, labels, seuils, unités, icônes ;
* valider les données avant insertion.

Sur desktop, le panneau peut être latéral. Sur mobile, il devient une bottom sheet plein écran.

### Import / export

L’app doit permettre :

* importer un profil `.json` ;
* exporter le profil courant en `.json` ;
* importer un `.zip` contenant plusieurs profils ou modules ;
* exporter un `.zip` contenant :

  * `profile.json`,
  * `modules/*.json`,
  * `assets/*` si nécessaire,
  * `manifest.json`,
  * éventuellement un `README.md`.

Pour les `.zip`, utiliser **JSZip**, qui permet de créer, lire et éditer des archives ZIP côté JavaScript. ([Stuk][4])

### Moteur de formulaires et tests

L’app doit pouvoir gérer des contenus simples ou complexes à partir de métadonnées JSON :

* QCM ;
* questions à choix multiples ;
* échelles de Likert ;
* questions pondérées ;
* scores par catégorie ;
* matrices ;
* branchements conditionnels ;
* seuils d’interprétation ;
* profils typologiques ;
* résultats multi-axes.

Exemples :

* test de personnalité ;
* test de préférences professionnelles ;
* test de compétences ;
* test de style cognitif ;
* auto-évaluation ;
* questionnaire de valeurs ;
* mini-test de culture générale ;
* score de compatibilité ;
* radar de soft skills.

Les structures JSON doivent être validées avec **JSON Schema**, qui sert précisément à garantir la cohérence, la validité et l’interopérabilité de données JSON. ([JSON Schema][5]) Pour la validation côté JavaScript, utiliser **Ajv**, qui permet de valider des données JSON via des schémas déclaratifs et fonctionne notamment dans le navigateur. ([Ajv][6])

## 5. Dataviz et rendu graphique

Les modules numériques doivent pouvoir être représentés de plusieurs manières :

* bar chart ;
* line chart ;
* radar chart ;
* donut ;
* pie ;
* gauge ;
* heatmap ;
* treemap ;
* scatter ;
* stacked bars ;
* scorecards ;
* sparkline ;
* polar chart.

La librairie recommandée est **Apache ECharts**, car elle fournit de nombreux types de graphiques, des composants combinables et un rendu interactif adapté au navigateur. ([echarts.apache.org][7]) Elle est aussi utilisable via CDN, ce qui colle bien à l’approche statique et légère. ([echarts.apache.org][8])

Chaque module contenant des données quantitatives doit exposer plusieurs `renderModes`, par exemple :

```json
{
  "renderModes": ["card", "radar", "donut", "bar", "gauge"]
}
```

L’utilisateur doit pouvoir passer d’un rendu à l’autre depuis les options du module.

## 6. UX / UI attendue

L’interface doit être très moderne, fluide, premium, avec un effet “dashboard futuriste / portfolio vivant”.

Direction visuelle :

* glassmorphism maîtrisé ;
* cartes flottantes ;
* ombres douces ;
* micro-interactions ;
* transitions fluides ;
* grille élégante ;
* typographie nette ;
* mode clair / sombre ;
* thèmes personnalisables ;
* icônes modernes ;
* animations au hover ;
* états vides visuellement attractifs ;
* rendu imprimable sobre.

Pour les animations, utiliser une librairie existante comme **Motion**, qui est pensée pour les animations web modernes en JavaScript, React et Vue, ou GSAP si des timelines complexes deviennent nécessaires. ([Motion][9])

Point important : les interactions ne doivent pas dépendre uniquement du hover, car le hover n’existe pas vraiment sur mobile. Prévoir :

* hover sur desktop ;
* tap sur mobile ;
* long press ou menu flottant pour les actions contextuelles ;
* raccourcis clavier optionnels ;
* accessibilité minimale au clavier.

## 7. Système de modules

Prévoir dès le départ une architecture extensible.

Types de modules initiaux :

* `identity-card` : identité, titre, bio courte, avatar ;
* `starter-pack` : tags, objets, goûts, références ;
* `skills-radar` : compétences sur plusieurs axes ;
* `personality-test` : questionnaire + score ;
* `timeline` : parcours, étapes, expériences ;
* `stats-card` : métriques clés ;
* `quote-card` : citation personnelle ;
* `values-map` : valeurs pondérées ;
* `interests-cloud` : centres d’intérêt ;
* `compatibility-score` : score calculé ;
* `matrix` : matrice 2x2 ;
* `ranked-list` : top préférences ;
* `badge-wall` : badges, certifications, accomplissements ;
* `project-card` : projet notable ;
* `contact-card` : liens, réseaux, QR code éventuel.

Chaque module doit être décrit par un manifest JSON.

Exemple simplifié :

```json
{
  "id": "skills-radar",
  "version": "1.0.0",
  "label": "Radar de compétences",
  "category": "skills",
  "defaultSize": { "w": 4, "h": 4 },
  "minSize": { "w": 3, "h": 3 },
  "formSchema": {
    "fields": [
      {
        "key": "skills",
        "type": "array",
        "label": "Compétences",
        "items": {
          "label": "string",
          "value": "number",
          "min": 0,
          "max": 100
        }
      }
    ]
  },
  "renderModes": ["radar", "bar", "donut", "score-list"],
  "printMode": "compact"
}
```

## 8. Moteur de scoring

Le moteur de tests doit être générique.

Il doit gérer :

* scores simples ;
* scores pondérés ;
* scores par dimension ;
* scores inversés ;
* scores conditionnels ;
* seuils d’interprétation ;
* mapping score → texte ;
* mapping score → couleur ;
* mapping score → chart.

Exemple :

```json
{
  "scoring": {
    "dimensions": ["introversion", "creativity", "structure"],
    "rules": [
      {
        "questionId": "q1",
        "answers": {
          "a": { "introversion": 2 },
          "b": { "creativity": 3 },
          "c": { "structure": 1 }
        }
      }
    ],
    "interpretations": [
      {
        "dimension": "creativity",
        "min": 80,
        "label": "Très créatif",
        "description": "Profil très orienté exploration, imagination et création."
      }
    ]
  }
}
```

## 9. Architecture technique recommandée

Stack cible :

* HTML/CSS/JavaScript moderne ;
* ES modules ;
* Vite pour le dev/build statique ;
* GridStack.js pour la grille ;
* Apache ECharts pour les charts ;
* Ajv pour la validation JSON Schema ;
* JSZip pour import/export ZIP ;
* localForage pour stockage local ;
* Motion ou GSAP pour animations ;
* DOMPurify si l’app autorise du HTML riche saisi par l’utilisateur, afin de nettoyer le HTML avant injection et limiter les risques XSS. ([GitHub][10])

Architecture de fichiers proposée :

```txt
/
  index.html
  package.json
  vite.config.js

/src
  main.js
  app.js

  /core
    store.js
    schema-validator.js
    import-export.js
    module-registry.js
    grid-manager.js
    theme-manager.js
    print-manager.js
    scoring-engine.js
    render-engine.js

  /modules
    identity-card.json
    starter-pack.json
    skills-radar.json
    personality-test.json
    timeline.json

  /renderers
    card-renderer.js
    chart-renderer.js
    radar-renderer.js
    donut-renderer.js
    timeline-renderer.js
    list-renderer.js

  /ui
    side-panel.js
    module-picker.js
    module-toolbar.js
    empty-state.js
    toast.js
    modal.js

  /styles
    base.css
    theme.css
    grid.css
    modules.css
    print.css
```

## 10. Modèle de données principal

Profil :

```json
{
  "schemaVersion": "1.0.0",
  "profileId": "local-profile-001",
  "createdAt": "2026-06-14T00:00:00.000Z",
  "updatedAt": "2026-06-14T00:00:00.000Z",
  "meta": {
    "displayName": "Pierre",
    "headline": "Creative technologist",
    "theme": "neo-glass-dark"
  },
  "layout": [
    {
      "instanceId": "mod-identity-001",
      "moduleId": "identity-card",
      "x": 0,
      "y": 0,
      "w": 4,
      "h": 3
    }
  ],
  "modules": {
    "mod-identity-001": {
      "moduleId": "identity-card",
      "renderMode": "hero-card",
      "data": {
        "name": "Pierre",
        "bio": "Profil hybride, créatif, analytique et orienté produit."
      }
    }
  }
}
```

## 11. Règles d’expérience utilisateur

L’utilisateur doit pouvoir arriver sur l’app et comprendre immédiatement quoi faire.

Parcours idéal :

1. L’utilisateur ouvre l’app.
2. Il voit une grille vide avec un bel état d’accueil.
3. Il clique sur “Créer mon profil” ou glisse un module.
4. Un panneau s’ouvre.
5. Il choisit un module.
6. Il remplit un formulaire.
7. Le module apparaît immédiatement sur la grille.
8. Il peut le déplacer, le redimensionner, changer son rendu.
9. Tout est sauvegardé automatiquement en local.
10. Il peut exporter son profil en `.json` ou `.zip`.
11. Il peut importer ce fichier ailleurs et retrouver le même profil.

## 12. Exigences non négociables

* Pas de backend obligatoire.
* Pas de base de données serveur.
* Pas d’authentification.
* Pas de dépendance critique à une API externe.
* Tout doit être portable.
* Tout profil doit être exportable.
* Tout profil exporté doit être réimportable.
* Les modules doivent être déclaratifs autant que possible.
* Les données doivent être validées.
* Le layout doit être sauvegardé.
* Le rendu doit être responsive.
* L’impression doit produire une page propre.
* L’architecture doit être simple à comprendre et extensible.

## 13. Formulation directe à donner à Codex

```txt
Développe une application web statique local-first appelée “Modular Profile”.

Objectif :
Créer un générateur de profil personnel modulaire, entre starter pack interactif, CV augmenté et dashboard personnel data-driven. L’utilisateur doit pouvoir composer une page profil à partir de modules visuels déplaçables, redimensionnables, éditables et exportables.

Contraintes :
- Application statique, sans backend obligatoire.
- Pas de base de données serveur.
- Stockage uniquement côté navigateur.
- Import/export JSON.
- Import/export ZIP contenant plusieurs JSON.
- Architecture en ES modules.
- Code clair, modulaire, extensible.
- Dépendances externes autorisées via CDN ou npm/Vite.
- L’app doit pouvoir être déployée sur un hébergement statique simple.

Librairies recommandées :
- GridStack.js pour la grille responsive drag/drop/resize.
- Apache ECharts pour charts, radar, donuts, gauges et dataviz.
- Ajv pour validation JSON Schema.
- JSZip pour import/export ZIP.
- localForage pour stockage local.
- Motion ou GSAP pour micro-interactions et animations.
- DOMPurify si du HTML utilisateur est rendu.

Écrans principaux :
1. Vue profil avec grille de modules.
2. Panneau latéral/bottom sheet pour ajouter ou éditer un module.
3. Gestion import/export.
4. Sélecteur de thème.
5. Mode impression propre.

Fonctionnalités :
- Ajouter un module depuis la grille.
- Modifier un module.
- Supprimer un module.
- Dupliquer un module.
- Déplacer et redimensionner un module.
- Changer le mode de rendu d’un module.
- Sauvegarder automatiquement le profil en local.
- Exporter le profil en JSON.
- Exporter un bundle ZIP.
- Importer un JSON.
- Importer un ZIP.
- Valider les fichiers importés.
- Afficher les erreurs de validation proprement.
- Rendre la page imprimable.

Modules initiaux à implémenter :
- identity-card
- starter-pack
- skills-radar
- personality-test
- timeline
- stats-card
- quote-card
- values-map
- interests-cloud
- project-card

Le système de modules doit être basé sur des manifests JSON décrivant :
- l’identifiant du module ;
- son nom ;
- sa catégorie ;
- ses tailles min/max/default ;
- son formulaire ;
- ses règles de validation ;
- ses renderModes ;
- ses règles de scoring éventuelles ;
- son comportement print.

Le moteur de scoring doit permettre :
- QCM ;
- questions à choix multiples ;
- échelles de Likert ;
- scores pondérés ;
- scores par dimension ;
- interprétations textuelles ;
- génération automatique de visualisations.

UX :
Créer une interface très moderne, premium, animée, intuitive :
- glassmorphism léger ;
- cartes flottantes ;
- hover actions sur desktop ;
- tap/long press sur mobile ;
- toolbar contextuelle sur chaque module ;
- transitions fluides ;
- dark mode ;
- responsive parfait ;
- print mode propre.

Livrable attendu :
Un projet complet avec :
- index.html ;
- src/main.js ;
- architecture core/modules/renderers/ui/styles ;
- quelques modules fonctionnels ;
- exemples de profils JSON ;
- import/export opérationnel ;
- sauvegarde locale ;
- grille responsive ;
- charts fonctionnels ;
- README avec instructions de lancement et d’extension.
```

La version la plus robuste de ton idée, c’est donc : **un moteur local de profils modulaires déclaratifs**, où les profils, modules, questionnaires, layouts et rendus sont tous décrits, validés, transportés et réinterprétés par JSON. C’est ce qui rend l’app simple à héberger, puissante à étendre, et parfaite pour Codex.

[1]: https://vite.dev/guide/static-deploy?utm_source=chatgpt.com "Deploying a Static Site"
[2]: https://github.com/localforage/localforage?utm_source=chatgpt.com "localForage"
[3]: https://gridstackjs.com/?utm_source=chatgpt.com "Gridstack.js | Build interactive dashboards in minutes."
[4]: https://stuk.github.io/jszip/?utm_source=chatgpt.com "JSZip"
[5]: https://json-schema.org/?utm_source=chatgpt.com "JSON Schema"
[6]: https://ajv.js.org/?utm_source=chatgpt.com "Ajv JSON schema validator"
[7]: https://echarts.apache.org/?utm_source=chatgpt.com "Apache ECharts"
[8]: https://echarts.apache.org/handbook/en/basics/download/?utm_source=chatgpt.com "Download ECharts - Basics - Handbook"
[9]: https://motion.dev/?utm_source=chatgpt.com "Motion: JavaScript & React animation library"
[10]: https://github.com/cure53/dompurify?utm_source=chatgpt.com "DOMPurify - a DOM-only, super-fast, uber-tolerant XSS ..."
