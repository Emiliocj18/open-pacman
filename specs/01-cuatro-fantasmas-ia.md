# SPEC 01 — Cuatro fantasmas con personalidad propia

> **Estado:** Aprovado
> **Depende de:** — (ninguna)
> **Fecha:** 2026-08-05
> **Objetivo:** Sustituir los 2 fantasmas actuales por 4 con personalidades distintas, ciclo scatter/chase, liberación escalonada desde la pen y colores clásicos.

## Scope

**In:**

- 4 fantasmas con personalidades clásicas: **blinky** (caza agresiva), **pinky** (emboscada 4 celdas delante), **inky** (flanqueo usando a blinky), **clyde** (tímido: se aparta al acercarse).
- Ciclo global de modos scatter/chase con tiempos del arcade.
- Los 4 nacen dentro de la pen y se liberan escalonadamente; los no liberados son visibles y "bobbeando" arriba/abajo.
- Colores clásicos ligados al tipo (`#ff0000`, `#ffb8ff`, `#00ffff`, `#ffb852`).
- Al perder una vida se reinicia todo (posiciones, salidas, ciclo de modos).

**Out of scope (para futuras specs):**

- Power pellet y modo "asustado" (fantasmas azules que Pac-Man puede comer).
- Velocidades distintas por tipo, frenado en túnel o aumento de velocidad por dots.
- Ojos volviendo a la pen tras ser comido, sonidos, niveles adicionales.

## Data model

`maze.js` — posiciones de salida (interior pen, filas 13 y 15):

```js
const GHOST_STARTS = [
  { x: 13, y: 13, kind: 'blinky' },
  { x: 14, y: 13, kind: 'pinky' },
  { x: 13, y: 15, kind: 'inky' },
  { x: 14, y: 15, kind: 'clyde' },
];
```

`game.js` — config por tipo, ciclo de modos y campos nuevos:

```js
const GHOST_KINDS = {
  blinky: { scatter: { x: 26, y: 1 }, releaseFrames: 0 },
  pinky:  { scatter: { x: 1, y: 1 },  releaseFrames: 120 },
  inky:   { scatter: { x: 26, y: 29 }, releaseFrames: 420 },
  clyde:  { scatter: { x: 1, y: 29 }, releaseFrames: 900 },
};
const MODE_CYCLE = [ // scatter/chase alternando; último chase perpetuo
  { mode: 'scatter', frames: 420 }, { mode: 'chase', frames: 1200 },
  { mode: 'scatter', frames: 420 }, { mode: 'chase', frames: 1200 },
  { mode: 'scatter', frames: 300 }, { mode: 'chase', frames: 1200 },
  { mode: 'scatter', frames: 300 }, { mode: 'chase', frames: Infinity },
];
```

Cada fantasma añade `released`, `leavingPen`, `releaseFrames`. El juego añade `mode`, `modeIndex`, `modeFrames`. Targets de chase: blinky→celda de Pac-Man; pinky→4 celdas delante según `p.dir`; inky→`2·P − B` (P = punto 2 celdas delante, B = posición de blinky); clyde→Pac-Man si distancia Manhattan >8, si no su esquina. Elección de dirección: greedy por distancia Manhattan al target, igual que el `hunter` actual. Esquinas adaptadas a celdas alcanzables: (1,1), (26,1), (26,29), (1,29). Movimiento en pen restringido a `y ∈ [13,15]` para no escapar por la puerta antes de tiempo.

## Implementation plan

1. `maze.js`: `GHOST_STARTS` → 4 entradas con los kinds (sigue funcional: `decideGhost` cae en random para kinds nuevos; hay 4 colores).
2. `game.js`: añadir `GHOST_KINDS`, campos `released/leavingPen/releaseFrames/mode*` y reinicio completo en `resetPositions`.
3. `game.js`: ciclo scatter/chase global (`MODE_CYCLE`, avance por frames).
4. `game.js`: `ghostTarget()` + reescritura de `decideGhost()` greedy-hacia-target (elimina `hunter`/`random`).
5. `game.js`: movimiento de pen (bobbing entre filas 13-15), cuenta atrás de liberación y salida por la puerta hacia arriba.
6. `render.js`: colores por `kind` en vez de por índice.
7. Verificación manual en navegador de todos los criterios.

## Acceptance criteria

- [ ] Aparecen exactamente 4 fantasmas visibles en la pen al crear partida.
- [ ] Cada uno con su color clásico, independiente del orden del array.
- [ ] Liberación escalonada: blinky al instante, pinky ~2s, inky ~7s, clyde ~15s.
- [ ] Los no liberados "bobbean" en la pen y no salen por la puerta antes de su turno.
- [ ] En scatter, cada fantasma se dirige a su esquina.
- [ ] En chase, blinky persigue la celda de Pac-Man; pinky apunta 4 celdas delante; inky usa `2·P−B`; clyde persigue solo si está a >8 celdas (si no, a su esquina).
- [ ] El ciclo sigue 7/20/7/20/5/20/5 s y luego chase perpetuo.
- [ ] Al perder una vida vuelven a la pen y se reinician salidas y ciclo de modos.
- [ ] Velocidad uniforme (GHOST_SPEED) en los 4.
- [ ] Sin errores en consola; dots, puntos, vidas y fin de partida siguen funcionando.

## Decisions

- **Sí:** personalidades clásicas blinky/pinky/inky/clyde. Diferentes y verificables una a una.
- **Sí:** greedy por Manhattan hacia un target (coherente con el `hunter` actual). No hace falta pathfinding.
- **Sí:** ciclo global scatter/chase con tiempos del arcade, por frames (~60fps).
- **Sí:** colores clásicos ligados al `kind`.
- **Sí:** los 4 en la pen, liberación 0/2/7/15s, visibles y bobbing.
- **Sí:** reiniciar todo al perder una vida.
- **No:** power pellet / modo asustado — otra spec (decisión del usuario).
- **No:** velocidades distintas — uniforme (decisión del usuario).
- **No:** frenado en túnel, velocidad por dots, ojos de retorno, A* completo.

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Timers por frames asumen 60fps; a 120Hz van el doble de rápido | Ya es la convención del juego (movimientos por frame); documentado, un futuro spec de delta-time lo resolvería |
| El greedy puede oscilar en callejones | Se excluye la dirección contraria; hereda el comportamiento probado del hunter |
| Dos fantasmas comparten columna en la pen y se cruzan visualmente | Aceptado: en el original también se atraviesan |
| Un no-liberado podría escapar por la puerta al bobbear | El movimiento de pen limita `y ∈ [13,15]`; la puerta solo se cruza al liberarse |

## What is **not** in this spec

- Power pellet y modo asustado, comer fantasmas y ojos de retorno.
- Velocidades por tipo, frenado en túnel, sonidos, niveles.
- Pathfinding completo (A*).

Cada uno de esos, si llega, va en su propia spec.
