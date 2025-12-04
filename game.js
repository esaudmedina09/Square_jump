(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const btnStart = document.getElementById('btnStart');
  const scoreEl = document.getElementById('score');
  const hiScoreEl = document.getElementById('hiscore');

  const W = canvas.width;
  const H = canvas.height;

  let running = false, gameOver = false, score = 0;
  let hiScore = parseInt(localStorage.getItem('dino_hiscore') || '0', 10);

  const gravity = 0.9, groundY = H - 40;
  let speed = 6, spawnTimer = 0;

  const dino = { x: 50, y: groundY - 40, w: 44, h: 40, vy: 0, jumping: false, animTime: 0 };
  const obstacles = [], clouds = [], groundSegments = [];

  for (let i = 0; i < 3; i++) groundSegments.push({ x: i * W, y: groundY, w: W, h: 40 });
  for (let i = 0; i < 3; i++) clouds.push({ x: i * 300 + 200, y: 50 + Math.random() * 60, w: 60, h: 24, speed: 1 + Math.random() * 0.6 });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') { jump(); e.preventDefault(); }
    if (e.code === 'Enter' && !running) startGame();
  });
  canvas.addEventListener('pointerdown', () => jump());
  btnStart.addEventListener('click', () => startGame());

  function startGame() {
    running = true; gameOver = false; score = 0; speed = 6;
    dino.y = groundY - dino.h; dino.vy = 0; dino.jumping = false;
    obstacles.length = 0; spawnTimer = 0;
    updateHUD();
  }

  function jump() {
    if (gameOver) return;
    if (!running) { startGame(); return; }
    if (!dino.jumping) { dino.vy = -16; dino.jumping = true; } // salto más alto
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
    speed += 0.0008;
    dino.vy += gravity; dino.y += dino.vy;

    // Suelo
    if (dino.y >= groundY - dino.h) {
      dino.y = groundY - dino.h;
      dino.vy = 0;
      dino.jumping = false;
    }

    dino.animTime += dt;

    for (const seg of groundSegments) { seg.x -= speed; if (seg.x + seg.w < 0) seg.x += groundSegments.length * seg.w; }
    for (const cl of clouds) { cl.x -= cl.speed; if (cl.x + cl.w < 0) { cl.x = W + Math.random() * 200; cl.y = 40 + Math.random() * 80; } }

    spawnTimer -= dt;
    if (spawnTimer <= 0) { spawnObstacle(); spawnTimer = 1.2 + Math.random() * 1.1; }
    for (const ob of obstacles) ob.x -= speed;
    while (obstacles.length && obstacles[0].x + obstacles[0].w < 0) obstacles.shift();

    // Colisiones con obstáculos
    for (const ob of obstacles) {
      if (intersects(dino, ob)) {
        // Si el dino cae desde arriba sobre el obstáculo
        if (dino.vy > 0 && dino.y + dino.h <= ob.y + 10) {
          dino.y = ob.y - dino.h; // lo coloca encima
          dino.vy = 0;
          dino.jumping = false;
        } else {
          // Si choca de lado o por debajo, sí es Game Over
          running = false;
          gameOver = true;
        }
      }
    }

    score += Math.floor(speed * 0.2);
    updateHUD();
  }

  function spawnObstacle() {
    const types = [ { w: 24, h: 20 }, { w: 28, h: 24 }, { w: 34, h: 28 } ]; // más bajos
    const t = types[Math.floor(Math.random() * types.length)];
    obstacles.push({ x: W + 20, y: groundY - t.h, w: t.w, h: t.h });
  }

  function intersects(a, b) {
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
    ctx.clearRect(0, 0, W, H);

    // Fondo
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

    // UI
    ctx.fillStyle = isDark ? '#eee' : '#333';
    ctx.font = 'bold 16px system-ui';

    if (!running && !gameOver) {
      centeredText('Pulsa Iniciar o Enter para comenzar', W / 2, 80);
      ctx.font = 'italic 14px system-ui';
      centeredText('"Mas buscad primeramente el reino de Dios y su justicia,"', W / 2, 120);
      centeredText('"y todas estas cosas os serán añadidas." (Mateo 6:33)', W / 2, 140);
    }

    if (gameOver) {
      centeredText('Game Over', W / 2, 80);
      centeredText('Presiona Iniciar, Enter o toca para reiniciar', W / 2, 110);
    }
  }
})();