# MODULOP

Application local-first de profils modulaires, interactifs et transportables.

## Lancer

```powershell
npm install
npm start
```

Puis ouvrir <http://127.0.0.1:8080>.

Le serveur Vite écoute sur <http://127.0.0.1:8080>. Le build de production est
entièrement statique et ne dépend d'aucun CDN.

## Fonctionnalités actuelles

- canevas unique sans distinction entre consultation et édition ;
- espaces locaux nommables, exportables et supprimables depuis l’accueil ;
- espace vierge réel avec onboarding de dépôt, collage, import et intention ;
- fragments créés depuis texte, URL, image locale, JSON/ZIP MODULOP ou fragment autonome ;
- bibliothèque catégorisée ;
- grille responsive ;
- réorganisation par glisser-déposer ;
- redimensionnement direct par poignées, y compris au clavier ;
- actions contextuelles avec tooltips et menu secondaire ;
- capture PNG d'un fragment vers le presse-papier ;
- confirmations accessibles pour les actions destructives ;
- éditeurs spécialisés avec autosave et historique ;
- Markdown/WYSIWYG pour l'introduction ;
- médias locaux dans IndexedDB ;
- trois atmosphères visuelles ;
- pseudonyme anonyme généré en trois parties ;
- sauvegarde automatique dans IndexedDB ;
- import/export JSON, `.modulop.zip` autonome et `.modulop-fragment.zip` ;
- skeleton de chargement avec progression explicite par fragment ;
- menu global réduit à une pastille ;
- panneaux ancrables sur quatre côtés ou flottants et redimensionnables ;
- questionnaire Gardner de 72 items avec feedback et trois rendus ECharts ;
- Constellation D3 2D et variante Three.js ;
- support de `prefers-reduced-motion`.

## Structure

```text
index.html
src/
  main.js
  styles.css
  gardner.js
  core/
  editors/
  renderers/
  ui/
modules/
  gardner.module.json
```

`core/` contient le schéma, IndexedDB et les formats portables. `renderers/`
implémente le contrat de cycle de vie des fragments. `editors/` porte les
expériences de saisie, et `ui/` les primitives partagées.

Le manifeste [modules/gardner.module.json](modules/gardner.module.json) pose un
premier contrat déclaratif pour le questionnaire, le layout et ses renderers.

## Vérifier

```powershell
npm run check
npm run qa:browser
```

`qa:browser` lance Vite sur un port de test, pilote Microsoft Edge via
`playwright-core`, vérifie les parcours accueil → espace vierge → création de
fragment → panneau → retour accueil, puis écrit les captures dans `mockups/qa/`.

Si Edge n’est pas installé à l’emplacement Windows par défaut, définir :

```powershell
$env:MODULOP_BROWSER="C:\chemin\vers\msedge.exe"
npm run qa:browser
```

## Versioning

`package.json` porte le semver propre (`4.0.0`, `4.1.0`, etc.). L’app affiche une
version enrichie avec timestamp dans `src/core/version.js`.

```powershell
npm run release:patch
npm run release:minor
npm run release:major
```

Pour une itération sans changer de semver :

```powershell
npm run version:stamp
```
