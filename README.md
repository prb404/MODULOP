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
- introduction gérée comme un fragment normal ;
- sept modules préchargés et une bibliothèque catégorisée ;
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
- import/export JSON et `.modulop.zip` autonome ;
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
```
