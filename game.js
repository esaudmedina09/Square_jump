(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const btnStart = document.getElementById('btnStart');
  const scoreEl = document.getElementById('score');
  const hiScoreEl = document.getElementById('hiscore');

  const W = canvas.width;
  const H = canvas.height;

  let running = false, gameOver = true, score = 0;
  let hiScore = parseInt(localStorage.getItem('dino_hiscore') || '0', 10);

  const GRAVITY = 0.7; 
  const GROUND_Y = H - 1;
  
  let speed = 9;
  let spawnTimer = 1;
  let lastObstacleLandedOn = null; // Para rastrear en qué obstáculo está el dino

  const dino = { x: 1, y: GROUND_Y - 2, w: 2, h: 3, vy: 0, jumping: false, animTime: 0, onObstacle: false };
  
  const obstacles = [];
  const clouds = [];
  const groundSegments = [];

  for (let i = 0; i < 3; i++) groundSegments.push({ x: i * W, y: GROUND_Y, w: W, h: 4 });
  for (let i = 0; i < 3; i++) clouds.push({ x: i * 30 + 20, y: 5 + Math.random() * 60, w: 60, h: 20, speed: 10 + Math.random() * 0.6 });

  // Event Listeners
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { jump(); e.preventDefault(); }
    if (e.code === 'Enter' && !running) startGame();
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
    dino.onObstacle = false;
    lastObstacleLandedOn = null;
    obstacles.length = 0;
    spawnTimer = 1;
    updateHUD();
  }

  function jump() {
    if (gameOver) return;
    if (!running) { startGame(); return; }
    
    // Permitir saltar si está en el suelo o sobre un obstáculo
    if (!dino.jumping || dino.onObstacle) { 
      dino.vy = -16; 
      dino.jumping = true; 
      dino.onObstacle = false;
      lastObstacleLandedOn = null;
    } 
  }

  let last = performance.now();

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

    speed += 0.000145;
    dino.vy += GRAVITY; 
    dino.y += dino.vy;

    // Verificar suelo normal
    let onGround = dino.y >= GROUND_Y - dino.h;
    
    if (onGround) {
      dino.y = GROUND_Y - dino.h;
      dino.vy = 0;
      dino.jumping = false;
      dino.onObstacle = false;
      lastObstacleLandedOn = null;
    }

    dino.animTime += dt;

    // Movimiento de elementos
    for (const seg of groundSegments) { 
      seg.x -= speed * dt * 60; // Multiplicar por dt * 60 para velocidad consistente
      if (seg.x + seg.w < 0) seg.x += groundSegments.length * seg.w; 
    }
    
    for (const cl of clouds) { 
      cl.x -= cl.speed * dt; 
      if (cl.x + cl.w < 0) { 
        cl.x = W + Math.random() * 20; 
        cl.y = 40 + Math.random() * 20; 
      } 
    }

    // Generación y movimiento de obstáculos
    spawnTimer -= dt;
    if (spawnTimer <= 0) { 
      spawnObstacle(); 
      spawnTimer = 1.2 + Math.random() * 1.1 / (speed / 7); 
    }
    
    for (const ob of obstacles) {
      ob.x -= speed * dt * 60; // Mover obstáculos
    }
    
    // Eliminar obstáculos que salen de la pantalla
    while (obstacles.length && obstacles[0].x + obstacles[0].w < 0) obstacles.shift();

    // --- LÓGICA DE COLISIÓN MEJORADA ---
    dino.onObstacle = false; // Resetear cada frame
    
    // Primero, verificar si estamos sobre algún obstáculo
    let landedOnObstacle = null;
    
    for (let i = obstacles.length - 1; i >= 0; i--) {
      const ob = obstacles[i];
      
      // Verificar colisión
      if (collisionDetected(dino, ob)) {
        const dinoBottom = dino.y + dino.h;
        const obTop = ob.y;
        const tolerance = 5; // Tolerancia para aterrizaje
        
        // Si está cayendo y está cerca de la parte superior del obstáculo
        if (dino.vy >= 0 && dinoBottom >= obTop - tolerance && dinoBottom <= obTop + tolerance) {
          // Aterrizaje exitoso
          landedOnObstacle = ob;
          break;
        } else {
          // Colisión lateral o por debajo - GAME OVER
          running = false;
          gameOver = true;
          return;
        }
      }
    }
    
    // Si aterrizamos en un obstáculo este frame
    if (landedOnObstacle) {
      dino.y = landedOnObstacle.y - dino.h;
      dino.vy = 0;
      dino.jumping = false;
      dino.onObstacle = true;
      lastObstacleLandedOn = landedOnObstacle;
    } 
    // Si ya estábamos en un obstáculo y el obstáculo todavía existe
    else if (lastObstacleLandedOn && obstacles.includes(lastObstacleLandedOn)) {
      // Mantenernos encima del obstáculo mientras nos movemos con él
      dino.y = lastObstacleLandedOn.y - dino.h;
      dino.vy = 0;
      dino.jumping = false;
      dino.onObstacle = true;
    }
    // Si el obstáculo sobre el que estábamos ya no existe
    else if (lastObstacleLandedOn && !obstacles.includes(lastObstacleLandedOn)) {
      lastObstacleLandedOn = null;
      dino.onObstacle = false;
      // El dino comenzará a caer naturalmente
    }

    score += Math.floor(speed * 0.2);
    updateHUD();
  }

  function collisionDetected(a, b) {
    // Detección de colisión con márgenes ajustados
    const marginX = 1; // Muy pequeño para colisiones laterales
    const marginY = 2; // Para aterrizaje
    
    return !(a.x + a.w - marginX < b.x || 
             a.x + marginX > b.x + b.w || 
             a.y + a.h - marginY < b.y || 
             a.y + marginY > b.y + b.h);
  }

  function spawnObstacle() {
    const types = [ 
      { w: 10, h: 20 }, 
      { w: 20, h: 40 }, 
      { w: 40, h: 60 } 
    ];
    const t = types[Math.floor(Math.random() * types.length)];
    obstacles.push({ 
      x: W + 1, 
      y: GROUND_Y - t.h, 
      w: t.w, 
      h: t.h,
      id: Date.now() + Math.random() // ID único para rastrear
    });
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

    // Dino (cambia color si está sobre obstáculo)
    ctx.fillStyle = dino.onObstacle ? '#e9c46a' : '#2a9d8f';
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

    if (gameOver && running === false) {
      centeredText('Game Over', W / 2, 80); 
      ctx.font = 'bold 16px system-ui, sans-serif';
      centeredText('Presiona Iniciar, Enter o toca para reiniciar', W / 2, 110);
    }
    
    // Debug: mostrar estado del dino
    if (dino.onObstacle) {
      ctx.font = '10px monospace';
      ctx.fillStyle = '#ff0000';
      ctx.fillText('ON OBSTACLE', dino.x + 5, dino.y - 5);
    }
  }
})();
