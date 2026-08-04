# AGENTS.md

Juego Pac-Man en Vanilla JS/HTML/CSS. Sin build, sin tests, sin dependencias ni `package.json`. El objetivo del repo es aprender el enfoque **Spec-Driven Development**.

## Estructura y wiring

- `src/index.html` es la única entrada. Carga los scripts como **globales** en este orden estricto (no hay módulos ES ni imports):
  1. `js/maze.js` (define `MAZE`)
  2. `js/game.js` (define `createGame()` y `update(game)`)
  3. `js/render.js` (define `draw(ctx, game, frame)`)
  4. `js/main.js` (bucle, teclado, overlays)

- `main.js:9` espera los globales `createGame`, `update`, `draw`. Al añadir funciones nuevas, decláralas como globales (`function`/`const` a nivel de archivo); no las `export` ni las encierres en IIFE, o `main.js` no podrá llamarlas.

## Cómo ejecutar

No hay servidor de desarrollo ni scripts. Abre `src/index.html` en un navegador o sirve `src/` con el servidor estático que prefieras (p. ej. `python -m http.server`).

## Flujo de trabajo (Spec-Driven Development)

- Este repo usa los skills pinneados en `.agents/skills/` (fuente `klerith/fernando-skills`): `spec` para diseñar features grandes antes de codificar y `spec-impl` para implementarlas. Úsalos en lugar de improvisar.
- `spec` genera specs en la carpeta `specs/`. Respeta ese flujo cuando la feature sea grande.

## Convenciones

- La UI y los comentarios están en **español** (HTML `lang="es"`). Mantén el idioma en mensajes visibles y comentarios nuevos.
- No hay lint ni typecheck configurado: la validación es manual en navegador.
- Sin `.gitignore` ni `package.json`; no añadas tooling de build salvo que se pida.