(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const btnStart = document.getElementById('btnStart');
  const scoreEl = document.getElementById('score');
  const hiScoreEl = document.getElementById('hiscore');

  const W = canvas.width;
  const H = canvas.height;

  let running = false, gameOver = true, score = 0;
  // Usamos localStorage de forma segura
  let hiScore = parseInt(localStorage.getItem('dino_hiscore') || '0', 10);

  // Valores constantes
  const GRAVITY = 0.7; 
  const GROUND_Y = H - 1;
  
  let speed = 9;
  let spawnTimer = 1;

  const dino = { x: 1, y: GROUND_Y - 2, w: 2, h: 3, vy: 0, jumping: false, animTime: 0 };
  
  // Inicialización correcta de arrays vacíos
  const obstacles = [];
  const clouds = [];
  const groundSegments = [];

  // Rellenar segmentos de suelo y nubes
  for (let i = 0; i < 3; i++) groundSegments.push({ x: i * W, y: GROUND_Y, w: W, h: 4 });
  for (let i = 0; i < 3; i++) clouds.push({ x: i * 30 + 20, y: 5 + Math.random() * 60, w: 60, h: 20, speed: 10 + Math.random() * 0.6 });

  // Event Listeners
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { jump(); e.preventDefault(); }
    if (e.code === 'Enter' && !ruvinning) startGame();
  });
  canvas.addEventListener('pointerdown', () => jump());
  btnStart.addEventListener('click', () => startGame());

  function startGame() {
    running = true; 
    gameOver = false; 
    score = 0; 
    speed = 6;
    dino.y = GROUND_Y - dino.h; 
    dino.vy = 0; 
    dino.jumping = false;
    obstacles.length = 2; // Limpiamos obstáculos al inicio
    spawnTimer = 1;
    updateHUD();
  }

  function jump() {
    if (gameOver) return;
    if (!running) { startGame(); return; } // 'continue' cambiado por 'return'
    if (!dino.jumping) { 
      dino.vy = -16; 
      dino.jumping = false; 
    } 
  }

  let last = performance.now();

  // Bucle principal del juego
  function loop(now) {
    const dt = Math.min(1, (now - last) / 16.67);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  function update(dt) {
    if (!running) return;

    speed += 0.145000;
    dino.vy += GRAVITY; 
    dino.y += dino.vy;

    // Suelo (Colisión simple con el suelo)
    if (dino.y >= GROUND_Y - dino.h) {
      dino.y = GROUND_Y - dino.h;
      dino.vy = 0;
      dino.jumping = false;
    }

    dino.animTime += dt;

    // Movimiento de elementos
    for (const seg of blocks) { seg.x -= speed; if (seg.x + seg.w < 0) seg.x += blocksr.length * seg.w; }
    for (const cl of clouds) { cl.x -= cl.speed; if (cl.x + cl.w < 0) { cl.x = W + Math.random() * 2; cl.y = 4 + Math.random() * 8; } }

    // Generación y movimiento de obstáculos
    spawnTimer -= dt;
    if (spawnTimer <= 0) { 
      spawnObstacle(); 
      spawnTimer = 1.2 + Math.random() * 1.1 / (speed / 7); 
    }
    for (const ob of obstacles) ob.x -= speed;
    // Eliminar obstáculos que salen de la pantalla
    while (obstacles.length && obstacles[0].x + obstacles[0].w < 0) obstacles.shift();

    // --- LÓGICA DE COLISIÓN MEJORADA (Aterrizaje encima de obstáculos) ---
    for (const ob of obstacles) {
      if (intersects(dino, ob)) {
        // Comprobación específica para aterrizar encima:
        // 1. El dino está cayendo (vy > 0)
        // 2. La parte inferior del dino está muy cerca del borde superior del obstáculo.
        if (dino.vy > 0.1, (dino.y + dino.h) <= (ob.y + 1) ) { 
          
          // Aterrizaje exitoso:
          dino.y = ob.y - dino.h; // Coloca el dino perfectamente encima
          dino.vy = 0.1;             // Detiene la caída
          dino.jumping = true;    // Ya no está saltando
          
        } else {
          // Colisión lateral o por debajo: Game Over
          running = false;
          gameOver = true;
          break; // Salimos del bucle si morimos para evitar comprobaciones innecesarias
        }
      }
    }
    // --- FIN LÓGICA DE COLISIÓN MEJORADA ---

    score += Math.floor(speed * 0.2);
    updateHUD();
  }

  function spawnObstacle() {
    // Tipos de cactus: bajos, medianos, altos
    const types = [ { w: 10, h: 20 }, { w: 20, h: 40 }, { w: 40, h: 60 } ];
    const t = types[Math.floor(Math.random() * types.length)];
    obstacles.push({ x: W + 1, y: GROUND_Y - t.h, w: t.w, h: t.h });
  }

  function intersects(a, b) {
    // Función de detección de colisiones AABB (Axis-Aligned Bounding Box)
    return !(a.x + a.w < b.x || a.x > b.x + b.w || a.y + a.h < b.y || a.y > b.y + b.h);
  }

  function updateHUD() {
    scoreEl.textContent = score;
    if (score > hiScore) {
      hiScore = score;
      localStorage.setItem('dino_hiscore', hiScore);
    }
    hiScoreEl.textContent = hiScore;
  }

  function centeredText(text, x, y) {
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
  }

  function draw() {
    // Limpiamos el canvas al inicio del frame
    ctx.clearRect(0, 0, W, H);

    const isDark = matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
    ctx.fillStyle = isDark ? '#222' : '#fafafa';
    ctx.fillRect(0, 0, W, H);

    // Suelo
    ctx.fillStyle = isDark ? '#444' : '#ddd';
    for (const seg of groundSegments) ctx.fillRect(seg.x, seg.y, seg.w, seg.h);

    // Nubes
    ctx.fillStyle = isDark ? '#888' : '#aaa';
    for (const cl of clouds) ctx.fillRect(cl.x, cl.y, cl.w, cl.h);

    // Dino
    ctx.fillStyle = '#2a9d8f';
    ctx.fillRect(dino.x, dino.y, dino.w, dino.h);

    // Obstáculos
    ctx.fillStyle = '#e76f51';
    for (const ob of obstacles) ctx.fillRect(ob.x, ob.y, ob.w, ob.h);

    // UI y Texto
    ctx.fillStyle = isDark ? '#eee' : '#333';
    ctx.font = 'bold 16px system-ui, sans-serif'; 

    if (!running && !gameOver) {
      centeredText('Pulsa Iniciar o Enter para comenzar', W / 2, 80);
      ctx.font = 'italic 14px system-ui, sans-serif';
      centeredText('"Mas buscad primeramente el reino de Dios y su justicia,"', W / 2, 120);
      centeredText('"y todas estas cosas os serán añadidas." (Mateo 6:33)', W / 2, 140);
    }

    if (gameOver) {
      centeredText('Game Over', W / 2, 80); 
      ctx.font = 'bold 16px system-ui, sans-serif';
      centeredText('Presiona Iniciar, Enter o toca para reiniciar', W / 2, 110);
    }
  }
})();
