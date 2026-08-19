// game.js
// Estado y reglas. Depende de globals de maze.js: MAZE, TUNNEL_ROW,
// PACMAN_START, GHOST_STARTS.

const DIRS = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
};
const OPPOSITE = { left: 'right', right: 'left', up: 'down', down: 'up' };

const PACMAN_SPEED = 0.125; // 1/8 celda/frame -> alinea cada 8 frames
const GHOST_SPEED = 0.1;    // 1/10 celda/frame

// Personalidad por tipo: esquina de scatter y frames hasta su liberacion.
const GHOST_KINDS = {
  blinky: { scatter: { x: 26, y: 1 }, releaseFrames: 0 },
  pinky:  { scatter: { x: 1, y: 1 },  releaseFrames: 120 },
  inky:   { scatter: { x: 26, y: 29 }, releaseFrames: 420 },
  clyde:  { scatter: { x: 1, y: 29 }, releaseFrames: 900 },
};

// Ciclo global scatter/chase alternando; el ultimo chase es perpetuo.
const MODE_CYCLE = [ // scatter/chase alternando; último chase perpetuo
  { mode: 'scatter', frames: 420 }, { mode: 'chase', frames: 1200 },
  { mode: 'scatter', frames: 420 }, { mode: 'chase', frames: 1200 },
  { mode: 'scatter', frames: 300 }, { mode: 'chase', frames: 1200 },
  { mode: 'scatter', frames: 300 }, { mode: 'chase', frames: Infinity },
];

// Crea una partida nueva. Copia MAZE (pristino) a game.grid para poder comer
// dots sin destruir el original, y reiniciar.
function createGame() {
  const grid = MAZE.map( ( row ) => row.slice() );
  // La celda de inicio de Pacman arranca sin dot.
  grid[ PACMAN_START.y ][ PACMAN_START.x ] = 0;

  let dots = 0;
  for ( const row of grid ) for ( const v of row ) if ( v === 2 ) dots++;

  return {
    state: 'start',
    score: 0,
    lives: 3,
    dotsRemaining: dots,
    grid,
    pacman: {
      x: PACMAN_START.x,
      y: PACMAN_START.y,
      dir: 'left',
      nextDir: null,
      speed: PACMAN_SPEED,
    },
    ghosts: GHOST_STARTS.map( ( g ) => ( {
      x: g.x,
      y: g.y,
      dir: 'up',
      speed: GHOST_SPEED,
      kind: g.kind,
      released: false,
      leavingPen: false,
      releaseFrames: GHOST_KINDS[ g.kind ].releaseFrames,
    } ) ),
    mode: 'scatter',
    modeIndex: 0,
    modeFrames: 0,
  };
}

function aligned( v ) {
  return Math.abs( v - Math.round( v ) ) < 1e-3;
}

// Una celda es muro para el actor dado?
//   pacman: bloqueado por pared (1) y puerta (3)
//   ghost:  bloqueado solo por pared (1)
function isWall( grid, x, y, actor ) {
  if ( y < 0 || y >= grid.length ) return true;
  if ( x < 0 || x >= grid[ 0 ].length ) return true;
  const v = grid[ y ][ x ];
  if ( v === 1 ) return true;
  if ( v === 3 && actor === 'pacman' ) return true;
  return false;
}

// Puede el actor avanzar desde (x,y) en la direccion dir?
function canMove( grid, x, y, dir, actor ) {
  const d = DIRS[ dir ];
  if ( !d ) return false;
  const tx = x + d.x;
  const ty = y + d.y;
  // Tunel: salir por un borde en la fila del tunel siempre es valido.
  if ( ty === TUNNEL_ROW && ( tx < 0 || tx >= grid[ 0 ].length ) ) return true;
  return !isWall( grid, tx, ty, actor );
}

function wrapTunnel( a, width ) {
  if ( Math.round( a.y ) === TUNNEL_ROW ) {
    if ( a.x < 0 ) a.x += width;
    else if ( a.x >= width ) a.x -= width;
  }
}

function movePacman( game ) {
  const p = game.pacman;
  const grid = game.grid;
  const width = grid[ 0 ].length;

  if ( aligned( p.x ) && aligned( p.y ) ) {
    p.x = Math.round( p.x );
    p.y = Math.round( p.y );

    // Aplicar giro pendiente si es posible.
    if ( p.nextDir && canMove( grid, p.x, p.y, p.nextDir, 'pacman' ) ) {
      p.dir = p.nextDir;
      p.nextDir = null;
    }
    // Comer dot.
    if ( grid[ p.y ][ p.x ] === 2 ) {
      grid[ p.y ][ p.x ] = 0;
      game.score += 10;
      game.dotsRemaining--;
    }
    // Si no puede seguir, se detiene en la celda.
    if ( !canMove( grid, p.x, p.y, p.dir, 'pacman' ) ) return;
  }

  const d = DIRS[ p.dir ];
  p.x += d.x * p.speed;
  p.y += d.y * p.speed;
  wrapTunnel( p, width );
}

// Punto N celdas delante de Pac-Man segun su direccion actual.
function pacmanAhead( p, cells ) {
  const d = DIRS[ p.dir ] || { x: 0, y: 0 };
  return { x: Math.round( p.x ) + d.x * cells, y: Math.round( p.y ) + d.y * cells };
}

// Target del fantasma segun modo y personalidad.
function ghostTarget( game, g ) {
  const p = game.pacman;
  const px = Math.round( p.x );
  const py = Math.round( p.y );

  if ( game.mode === 'scatter' ) return GHOST_KINDS[ g.kind ].scatter;

  if ( g.kind === 'blinky' ) return { x: px, y: py };

  if ( g.kind === 'pinky' ) return pacmanAhead( p, 4 );

  if ( g.kind === 'inky' ) {
    const ahead = pacmanAhead( p, 2 );
    const blinky = game.ghosts.find( ( b ) => b.kind === 'blinky' );
    const bx = Math.round( blinky ? blinky.x : px );
    const by = Math.round( blinky ? blinky.y : py );
    return { x: 2 * ahead.x - bx, y: 2 * ahead.y - by };
  }

  // clyde: persigue solo si Pac-Man esta a >8 celdas; si no, a su esquina.
  const dist = Math.abs( Math.round( g.x ) - px ) + Math.abs( Math.round( g.y ) - py );
  if ( dist > 8 ) return { x: px, y: py };
  return GHOST_KINDS.clyde.scatter;
}

function decideGhost( game, g ) {
  const grid = game.grid;

  const options = Object.keys( DIRS ).filter(
    ( dir ) => dir !== OPPOSITE[ g.dir ] && canMove( grid, g.x, g.y, dir, 'ghost' )
  );
  // Sin salida (callejon): permitir el giro de 180.
  const choices = options.length ? options : [ '' + OPPOSITE[ g.dir ] ];

  const target = ghostTarget( game, g );
  let best = choices[ 0 ];
  let bestDist = Infinity;
  for ( const dir of choices ) {
    const d = DIRS[ dir ];
    const nx = g.x + d.x;
    const ny = g.y + d.y;
    const dist = Math.abs( nx - target.x ) + Math.abs( ny - target.y );
    if ( dist < bestDist ) {
      bestDist = dist;
      best = dir;
    }
  }
  g.dir = best;
}

// Bobbing en la pen: oscila arriba/abajo entre las filas 13 y 15.
function bobInPen( g ) {
  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    if ( g.y <= 13 ) g.dir = 'down';
    else if ( g.y >= 15 ) g.dir = 'up';
  }
  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
}

function moveGhost( game, g ) {
  const grid = game.grid;
  const width = grid[ 0 ].length;

  // En la pen: cuenta atras de liberacion y bobbing entre filas 13-15.
  if ( !g.released && !g.leavingPen ) {
    if ( g.releaseFrames > 0 ) {
      g.releaseFrames--;
      if ( g.releaseFrames > 0 ) {
        bobInPen( g );
        return;
      }
    }
    // Cuenta atras cumplida: empieza a salir por la puerta hacia arriba.
    g.leavingPen = true;
    g.dir = 'up';
  }

  // Saliendo de la pen: sube en linea recta hasta dejar la puerta atras.
  if ( g.leavingPen ) {
    g.dir = 'up';
    g.y -= g.speed;
    if ( aligned( g.y ) && g.y <= 11 ) {
      g.y = Math.round( g.y );
      g.leavingPen = false;
      g.released = true;
      g.dir = 'left';
    }
    return;
  }

  // Movimiento normal por el laberinto.
  if ( aligned( g.x ) && aligned( g.y ) ) {
    g.x = Math.round( g.x );
    g.y = Math.round( g.y );
    decideGhost( game, g );
    if ( !canMove( grid, g.x, g.y, g.dir, 'ghost' ) ) return;
  }

  const d = DIRS[ g.dir ];
  g.x += d.x * g.speed;
  g.y += d.y * g.speed;
  wrapTunnel( g, width );
}

function resetPositions( game ) {
  const p = game.pacman;
  p.x = PACMAN_START.x;
  p.y = PACMAN_START.y;
  p.dir = 'left';
  p.nextDir = null;
  game.ghosts.forEach( ( g, i ) => {
    g.x = GHOST_STARTS[ i ].x;
    g.y = GHOST_STARTS[ i ].y;
    g.dir = 'up';
    g.released = false;
    g.leavingPen = false;
    g.releaseFrames = GHOST_KINDS[ g.kind ].releaseFrames;
  } );
  game.mode = 'scatter';
  game.modeIndex = 0;
  game.modeFrames = 0;
}

function collides( a, b ) {
  return Math.abs( a.x - b.x ) < 0.5 && Math.abs( a.y - b.y ) < 0.5;
}

// Avanza el ciclo global de modos por frames acumulados.
function advanceMode( game ) {
  game.modeFrames++;
  const segment = MODE_CYCLE[ game.modeIndex ];
  if ( game.modeFrames >= segment.frames ) {
    game.modeIndex = Math.min( game.modeIndex + 1, MODE_CYCLE.length - 1 );
    game.mode = MODE_CYCLE[ game.modeIndex ].mode;
    game.modeFrames = 0;
  }
}

function update( game ) {
  advanceMode( game );
  movePacman( game );
  game.ghosts.forEach( ( g ) => moveGhost( game, g ) );

  for ( const g of game.ghosts ) {
    if ( collides( game.pacman, g ) ) {
      game.lives--;
      if ( game.lives <= 0 ) {
        game.state = 'lost';
        return;
      }
      resetPositions( game );
      break;
    }
  }

  if ( game.dotsRemaining <= 0 ) game.state = 'won';
}

window.createGame = createGame;
window.update = update;
window.DIRS = DIRS;
