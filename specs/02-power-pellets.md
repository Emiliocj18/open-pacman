# SPEC 02 — Power pellets que asustan a los fantasmas

> **Estado:** Aprovado
> **Depende de:** SPEC 01
> **Fecha:** 2026-08-19
> **Objetivo:** Añadir 4 power pellets en las esquinas clásicas del arcade que, al comerlas, activan un modo asustado de 6 segundos durante el que Pac-Man puede comerse a los fantasmas.

## Scope

**In:**

- 4 power pellets en las posiciones clásicas del arcade: (1,3), (26,3), (1,23), (26,23) — celdas-dot junto a las 4 esquinas, ya transitables en el `MAZE`.
- Al comer una power pellet: +50 pts y activación de modo asustado durante 6 s (360 frames).
- Durante el modo asustado, los fantasmas liberados se vuelven azules, se mueven en direcciones aleatorias y a mitad de velocidad.
- Pac-Man puede comerse a un fantasma azul: +200 pts y ese fantasma reaparece en la pen reiniciando su cuenta atrás de liberación.
- Los fantasmas no liberados (en la pen o saliendo) no son comestibles y siguen bobbeando normalmente.
- Al perder una vida se corta el power-up y las pellets ya comidas no reaparecen.

**Out of scope (para futuras specs):**

- Ojos que vuelven a la pen tras ser comido (ya diferido en SPEC 01).
- Parpadeo blanco del fantasma antes de terminar el power-up.
- Combo de puntos 200/400/800/1600 por fantasma consecutivo.
- Fruta, sonidos, niveles adicionales.

## Data model

`maze.js` — posiciones de las power pellets (sustituyen a un dot en esas celdas):

```js
const POWER_PELLETS = [
  { x: 1, y: 3 }, { x: 26, y: 3 },
  { x: 1, y: 23 }, { x: 26, y: 23 },
];
```

`game.js` — estado nuevo de partida y constantes:

```js
const POWER_DURATION = 360;   // 6 s a ~60fps
const POWER_SPEED = 0.05;     // mitad de GHOST_SPEED

// dentro del objeto devuelto por createGame():
powerFrames: 0,
```

Valores de `game.grid`: `1` pared, `2` dot, `3` puerta, `0` vacío y **`4` power pellet**. `dotsRemaining` cuenta `2` y `4` (ambos se comen y bajan el contador; el pellet vale 50 en vez de 10). Un fantasma es comestible si `game.powerFrames > 0 && g.released`. Al ser comido: `+200`, vuelve a su `GHOST_STARTS`, `released=false`, `leavingPen=false` y `releaseFrames` reiniciado a su valor de `GHOST_KINDS`.

## Implementation plan

1. `maze.js`: añadir `POWER_PELLETS` y exponerlo como global (`window.POWER_PELLETS`). Sigue funcional (nadie lo consume aún).
2. `game.js` `createGame`: marcar las 4 celdas con valor `4` y contar `2`+`4` en `dotsRemaining`; añadir `powerFrames: 0` al estado. Verificación: la partida carga sin errores.
3. `game.js` `movePacman`: al comer valor `4` → `score += 50`, `powerFrames = POWER_DURATION`; el valor `2` sigue dando 10. Verificación: comer un pellet da 50 y la partida sigue.
4. `game.js` `update` + `resetPositions`: en colisión, si el fantasma es comestible se come (ver paso 5); si no, vida perdida como ahora. `resetPositions` pone `powerFrames = 0`. Verificación: perder una vida corta el power-up.
5. `game.js` `moveGhost`/`decideGhost`: si `powerFrames > 0 && g.released`, elegir dirección aleatoria (no opuesta) y velocidad `POWER_SPEED`; al comer el fantasma, reinsertarlo en la pen con su cuenta atrás. Verificación: comerse a un fantasma azul da 200 y reaparece en la pen.
6. `render.js`: dibujar las power pellets más grandes (radio ~6 px) y en color claro; dibujar los fantasmas comestibles en azul (`#2121ff`) en vez de su color de `kind`.
7. Verificación manual en navegador de todos los criterios de abajo.

## Acceptance criteria

- [ ] Aparecen exactamente 4 power pellets visibles y más grandes que los dots, en (1,3), (26,3), (1,23), (26,23).
- [ ] Comer una power pellet suma 50 pts, elimina esa celda y activa el power-up.
- [ ] Al activarse, los 4 fantasmas liberados se vuelven azules; los de la pen conservan su color y no son comestibles.
- [ ] El power-up dura ~6 s (360 frames); al acabar, los fantasmas vuelven a su color y IA normal.
- [ ] Durante el power-up los fantasmas liberados se mueven en direcciones aleatorias y a mitad de velocidad.
- [ ] Chocar con un fantasma azul lo come: +200 pts y reaparece en la pen reiniciando su cuenta atrás de liberación.
- [ ] Chocar con un fantasma no azul sigue costando una vida y corta el power-up; las pellets ya comidas no reaparecen.
- [ ] Comer el último dot/pellet gana la partida igual que antes (el contador incluye las pellets).
- [ ] Sin errores en consola; scatter/chase, liberación escalonada y el resto del juego siguen funcionando.

## Decisions

- **Sí:** posiciones clásicas del arcade (1,3), (26,3), (1,23), (26,23). Las esquinas literales son pared; estas celdas ya son dots transitables.
- **Sí:** duración 6 s por frames (360), coherente con el ciclo de modos actual.
- **Sí:** fantasmas asustados con direcciones aleatorias y mitad de velocidad (clásico).
- **Sí:** fantasma comido reaparece en la pen con su cuenta atrás de liberación. Reutiliza `releaseFrames` sin dibujar ojos.
- **Sí:** 50 pts por pellet y 200 planos por fantasma. Simple y verificable.
- **Sí:** valor de grid `4` para la pellet; se cuenta en `dotsRemaining` para no romper la condición de victoria.
- **No:** combo 200/400/800/1600, parpadeo blanco final, ojos de retorno, fruta (futuras specs o decision del usuario).

## Risks

| Riesgo | Mitigación |
| --- | --- |
| Timers por frames asumen 60fps (a 120Hz va el doble de rápido) | Convención ya existente del juego (SPEC 01); un futuro spec de delta-time lo resolvería |
| Direcciones aleatorias pueden alternar dentro de un pasillo | Se excluye la dirección contraria, como el greedy actual |
| Re-liberar a un fantasma comido puede coincidir con otra cuenta atrás | Aceptado: cada fantasma reinicia su propio `releaseFrames` independiente |
| Comer pellet y chocar con fantasma en el mismo frame | `movePacman` corre antes que las colisiones en `update`; el power-up del frame actual aplica a la colisión |

## What is **not** in this spec

- Ojos de retorno a la pen, parpadeo blanco final, combo de puntos.
- Fruta, sonidos, niveles adicionales, cambios a la IA normal de los fantasmas.

Cada uno de esos, si llega, va en su propia spec.
