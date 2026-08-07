/* ═══════════════════════════════════════════════
   恐龙快跑（黄州府）· Web Edition
   原版 Python/Pygame by 柴桑 → 网页版 by Hanako
   ═══════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── DOM refs ── */
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const loadingEl = document.getElementById("loading");
  const progressEl = document.getElementById("loading-progress");
  const loadingText = document.getElementById("loading-text");
  const scoreEl = document.getElementById("score");
  const soundBtn = document.getElementById("sound-toggle");
  const startScreen = document.getElementById("startscreen");
  const gameOverScreen = document.getElementById("gameover");
  const finalScoreEl = document.getElementById("final-score");
  const restartBtn = document.getElementById("restart");
  const startBtn = document.getElementById("start");
  const btnLeft = document.getElementById("btn-left");
  const btnRight = document.getElementById("btn-right");
  const btnMusic = document.getElementById("btn-music");
  const mobileCtrls = document.getElementById("mobile-controls");

  /* ── Constants ── */
  const W = 1600, H = 900;                 // logical canvas (16:9)
  const GROUND_Y = H;                      // bottom of screen
  const DINO_W = 160, DINO_H = 240;        // dinosaur display size
  const DINO_X0 = (W - DINO_W) >> 1;       // start x (center)
  const OBSTACLE_W = 48, OBSTACLE_H = 64;  // hedgehog size
  const OBSTACLE_Y = GROUND_Y - OBSTACLE_H;
  const JUMP_VEL = -48;                    // initial jump velocity (px/frame equiv)
  const GRAVITY = 2.2;                     // gravity
  const MOVE_SPEED = 420;                  // px/sec left/right
  const BG_SCROLL_SPEED = 240;             // px/sec background
  const MIN_SPAWN_GAP = 380;               // min px between obstacles
  const OBSTACLE_MIN_SPEED = 320;
  const OBSTACLE_MAX_SPEED = 560;
  const SKY_COLOR = "#87cefa";

  /* ── Landmark sequence (matches Python image_paths order) ── */
  const LANDMARK_KEYS = [
    "HG2.0", "安国寺-removebg-preview", "HG3.0-removebg-preview",
    "遗爱湖建筑群-removebg-preview", "长江大桥-removebg-preview",
    "陈潭秋故居-removebg-preview", "壁纸-removebg-preview",
    "黄冈市博物馆-removebg-preview", "黄州师范学院-removebg-preview",
    "黄州文庙-removebg-preview", "栖霞楼-removebg-preview",
    "青云塔-removebg-preview", "柴小桑的背影"
  ];

  // Each landmark scaled to height H, column stays at natural proportion
  const COLUMN_KEY = "中式柱子"; // 1..13

  /* ── State ── */
  let assets = {};            // { key: { img: Image, w, h } }
  let bgSprites = [];         // [{ img, x, w, h, isColumn? }]
  let totalBgWidth = 0;       // total width of background strip
  let dino = null;
  let obstacles = [];
  let score = 0;
  let gameState = "loading";  // loading | start | playing | over
  let bgX = 0;                // camera scroll position
  let spawnTimer = 0;
  let spawnGap = 0;
  let soundOn = true;
  let bgmIndex = 0;
  let bgmAudio = null;
  let bgmLoaded = false;
  let lastTime = 0;
  let keys = {};
  let animId = null;

  /* ═══════════════════════════ Asset Loading ═══════════════════════════ */

  const ASSET_LIST = [
    // Dino & obstacle
    { key: "小恐龙-removebg-preview", path: "game/assets/小恐龙-removebg-preview.webp" },
    { key: "刺猬-removebg-preview", path: "game/assets/刺猬-removebg-preview.webp" },
    // Landmarks
    { key: "HG2.0", path: "game/assets/HG2.0.webp" },
    { key: "HG3.0-removebg-preview", path: "game/assets/HG3.0-removebg-preview.webp" },
    { key: "安国寺-removebg-preview", path: "game/assets/安国寺-removebg-preview.webp" },
    { key: "遗爱湖建筑群-removebg-preview", path: "game/assets/遗爱湖建筑群-removebg-preview.webp" },
    { key: "长江大桥-removebg-preview", path: "game/assets/长江大桥-removebg-preview.webp" },
    { key: "陈潭秋故居-removebg-preview", path: "game/assets/陈潭秋故居-removebg-preview.webp" },
    { key: "壁纸-removebg-preview", path: "game/assets/壁纸-removebg-preview.webp" },
    { key: "黄冈市博物馆-removebg-preview", path: "game/assets/黄冈市博物馆-removebg-preview.webp" },
    { key: "黄州师范学院-removebg-preview", path: "game/assets/黄州师范学院-removebg-preview.webp" },
    { key: "黄州文庙-removebg-preview", path: "game/assets/黄州文庙-removebg-preview.webp" },
    { key: "栖霞楼-removebg-preview", path: "game/assets/栖霞楼-removebg-preview.webp" },
    { key: "青云塔-removebg-preview", path: "game/assets/青云塔-removebg-preview.webp" },
    { key: "柴小桑的背影", path: "game/assets/柴小桑的背影.webp" },
    // Columns 1-13
    { key: "中式柱子1", path: "game/assets/中式柱子1.webp" },
    { key: "中式柱子2", path: "game/assets/中式柱子2.webp" },
    { key: "中式柱子3", path: "game/assets/中式柱子3.webp" },
    { key: "中式柱子4", path: "game/assets/中式柱子4.webp" },
    { key: "中式柱子5", path: "game/assets/中式柱子5.webp" },
    { key: "中式柱子6", path: "game/assets/中式柱子6.webp" },
    { key: "中式柱子7", path: "game/assets/中式柱子7.webp" },
    { key: "中式柱子8", path: "game/assets/中式柱子8.webp" },
    { key: "中式柱子9", path: "game/assets/中式柱子9.webp" },
    { key: "中式柱子10", path: "game/assets/中式柱子10.webp" },
    { key: "中式柱子11", path: "game/assets/中式柱子11.webp" },
    { key: "中式柱子12", path: "game/assets/中式柱子12.webp" },
    { key: "中式柱子13", path: "game/assets/中式柱子13.webp" },
  ];

  const AUDIO_LIST = [
    { key: "bgm0", path: "bgm/又见炊烟 - 邓丽君.mp3" },
    { key: "bgm1", path: "bgm/望春风 - 陈佳.mp3" },
  ];

  function loadAssets() {
    const total = ASSET_LIST.length + AUDIO_LIST.length;
    let loaded = 0;

    function progress() {
      loaded++;
      const pct = Math.round((loaded / total) * 100);
      progressEl.style.width = pct + "%";
      loadingText.textContent = "加载中… " + pct + "%";
      if (loaded >= total) {
        setTimeout(() => {
          loadingEl.classList.add("hidden");
          buildBackgroundSprites();
          setupGame();
          showStartScreen();
        }, 300);
      }
    }

    // Load images
    ASSET_LIST.forEach(({ key, path }) => {
      const img = new Image();
      img.onload = () => {
        assets[key] = { img, w: img.naturalWidth, h: img.naturalHeight };
        progress();
      };
      img.onerror = () => {
        console.warn("Failed to load:", path);
        assets[key] = { img: null, w: 100, h: 100 };
        progress();
      };
      img.src = path;
    });

    // Load audio (lazy, just mark progress)
    AUDIO_LIST.forEach(({ key, path }) => {
      assets[key] = { path };
      progress();
    });
  }

  /* ═══════════════════════════ Background Sprites ═══════════════════════ */

  function buildBackgroundSprites() {
    // Recreate the stitched sequence: landmark0, column1, landmark1, column2, ...
    // (matches Python image_paths order)
    bgSprites = [];
    let x = 0;

    for (let i = 0; i < LANDMARK_KEYS.length; i++) {
      // Landmark
      const lmKey = LANDMARK_KEYS[i];
      const lm = assets[lmKey];
      if (lm && lm.img) {
        const scale = H / lm.h;
        const sw = Math.round(lm.w * scale);
        bgSprites.push({ img: lm.img, x, w: sw, h: H, key: lmKey });
        x += sw;
      }

      // Column after each landmark
      const colIdx = i + 1;
      if (colIdx <= 13) {
        const colKey = COLUMN_KEY + colIdx;
        const col = assets[colKey];
        if (col && col.img) {
          const colScale = H / col.h;
          const colW = Math.round(col.w * colScale);
          bgSprites.push({ img: col.img, x, w: colW, h: H, key: colKey, isColumn: true });
          x += colW;
        } else {
          x += 36;
        }
      }
    }

    totalBgWidth = x;
  }

  /* ═══════════════════════════ Scaling ═══════════════════════════ */

  function resizeCanvas() {
    // Fill the entire viewport — stretch to fit any screen
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
  }

  /* ═══════════════════════════ Audio ═══════════════════════════ */

  function playBGM() {
    if (!soundOn) return;
    stopBGM();
    const key = "bgm" + bgmIndex;
    const asset = assets[key];
    if (!asset || !asset.path) return;
    try {
      bgmAudio = new Audio(asset.path);
      bgmAudio.volume = 0.4;
      bgmAudio.loop = true;
      const playPromise = bgmAudio.play();
      if (playPromise) {
        playPromise.catch(() => {
          // Autoplay blocked - will retry on next user gesture
          bgmLoaded = false;
        });
      }
      bgmLoaded = true;
    } catch (e) {
      bgmLoaded = false;
    }
  }

  function stopBGM() {
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio = null;
    }
  }

  function toggleSound() {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔊" : "🔇";
    if (soundOn) {
      playBGM();
    } else {
      stopBGM();
    }
  }

  function cycleBGM() {
    bgmIndex = (bgmIndex + 1) % 2;
    if (soundOn && gameState === "playing") {
      playBGM();
    }
  }

  /* ═══════════════════════════ Game Objects ═══════════════════════════ */

  function resetDino() {
    dino = {
      x: DINO_X0,
      y: GROUND_Y - DINO_H,
      w: DINO_W,
      h: DINO_H,
      vy: 0,
      jumping: false,
    };
  }

  function spawnObstacle() {
    const speed = OBSTACLE_MIN_SPEED + Math.random() * (OBSTACLE_MAX_SPEED - OBSTACLE_MIN_SPEED);
    obstacles.push({
      x: W + 20,
      y: OBSTACLE_Y,
      w: OBSTACLE_W,
      h: OBSTACLE_H,
      speed,
      scored: false,
    });
  }

  /* ═══════════════════════════ Collision ═══════════════════════════ */

  function rectsCollide(a, b) {
    // Shrink hitboxes for forgiving collision
    const margin = 14;
    return (
      a.x + margin < b.x + b.w - margin &&
      a.x + a.w - margin > b.x + margin &&
      a.y + margin < b.y + b.h - margin &&
      a.y + a.h - margin > b.y + margin
    );
  }

  /* ═══════════════════════════ Rendering ═══════════════════════════ */

  function drawBackground() {
    // Sky
    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, W, H);

    if (!totalBgWidth) return;

    const offset = bgX % totalBgWidth;

    for (const spr of bgSprites) {
      for (let copy = 0; copy < 2; copy++) {
        const sx = spr.x - offset + copy * totalBgWidth;
        if (sx + spr.w <= 0 || sx >= W) continue;
        ctx.drawImage(spr.img, sx, 0, spr.w, spr.h);
      }
    }
  }

  function drawDino() {
    const asset = assets["小恐龙-removebg-preview"];
    if (!asset || !asset.img) {
      // Fallback rect
      ctx.fillStyle = "#2d5a27";
      ctx.fillRect(dino.x, dino.y, dino.w, dino.h);
      return;
    }
    ctx.drawImage(asset.img, dino.x, dino.y, dino.w, dino.h);
  }

  function drawObstacles() {
    const asset = assets["刺猬-removebg-preview"];
    for (const obs of obstacles) {
      if (asset && asset.img) {
        ctx.drawImage(asset.img, obs.x, obs.y, obs.w, obs.h);
      } else {
        ctx.fillStyle = "#8b4513";
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      }
    }
  }

  function drawScore() {
    scoreEl.textContent = "Run,run,run: " + score;
  }

  /* ═══════════════════════════ Game Loop ═══════════════════════════ */

  function update(dt) {
    // Clamp dt to avoid huge jumps after tab switch
    const cappedDt = Math.min(dt, 0.1);

    // Background scroll
    bgX += BG_SCROLL_SPEED * cappedDt;

    // Dino physics
    if (dino.jumping) {
      dino.y += dino.vy * cappedDt * 60;
      dino.vy += GRAVITY * cappedDt * 60;
      if (dino.y >= GROUND_Y - dino.h) {
        dino.y = GROUND_Y - dino.h;
        dino.jumping = false;
        dino.vy = 0;
      }
    }

    // Dino horizontal movement
    if (keys["ArrowLeft"] || keys["KeyA"]) {
      dino.x -= MOVE_SPEED * cappedDt;
    }
    if (keys["ArrowRight"] || keys["KeyD"]) {
      dino.x += MOVE_SPEED * cappedDt;
    }
    dino.x = Math.max(0, Math.min(W - dino.w, dino.x));

    // Spawn obstacles
    spawnTimer -= cappedDt;
    if (spawnTimer <= 0) {
      spawnObstacle();
      spawnTimer = 0.9 + Math.random() * 1.4;
    }

    // Update obstacles
    for (const obs of obstacles) {
      obs.x -= obs.speed * cappedDt;
      if (!obs.scored && obs.x + obs.w < dino.x) {
        obs.scored = true;
        score++;
        drawScore();
      }
    }

    // Remove off-screen obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
      if (obstacles[i].x + obstacles[i].w < -50) {
        obstacles.splice(i, 1);
      }
    }

    // Collision
    for (const obs of obstacles) {
      if (rectsCollide(dino, obs)) {
        endGame();
        return;
      }
    }
  }

  function render() {
    drawBackground();
    drawObstacles();
    drawDino();
  }

  function gameLoop(timestamp) {
    if (gameState !== "playing") {
      animId = requestAnimationFrame(gameLoop);
      return;
    }

    if (lastTime === 0) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    update(dt);
    render();
    animId = requestAnimationFrame(gameLoop);
  }

  /* ═══════════════════════════ Game States ═══════════════════════════ */

  function setupGame() {
    resizeCanvas();
    resetDino();
    obstacles = [];
    score = 0;
    bgX = 0;
    spawnTimer = 0.6;
    drawScore();
  }

  function showStartScreen() {
    gameState = "start";
    startScreen.hidden = false;
    gameOverScreen.hidden = true;
    mobileCtrls.style.display = "none";
    scoreEl.style.display = "none";
    soundBtn.style.display = "none";
    drawBackground();
    resetDino();
    drawDino();
  }

  function startGame() {
    gameState = "playing";
    startScreen.hidden = true;
    gameOverScreen.hidden = true;
    scoreEl.style.display = "block";
    soundBtn.style.display = "flex";
    mobileCtrls.style.display = "";
    lastTime = 0;
    setupGame();
    if (soundOn) playBGM();
  }

  function endGame() {
    gameState = "over";
    stopBGM();
    gameOverScreen.hidden = false;
    finalScoreEl.textContent = "最终得分：" + score;
    scoreEl.style.display = "none";
    soundBtn.style.display = "none";
    mobileCtrls.style.display = "none";
  }

  function restartGame() {
    gameOverScreen.hidden = true;
    startGame();
  }

  /* ═══════════════════════════ Input ═══════════════════════════ */

  function onKeyDown(e) {
    keys[e.code] = true;
    if (gameState === "playing") {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (!dino.jumping) {
          dino.jumping = true;
          dino.vy = JUMP_VEL;
        }
      }
      if (e.code === "KeyM") {
        cycleBGM();
      }
    }
    if (e.code === "Space" && gameState === "start") {
      e.preventDefault();
      startGame();
    }
    if (e.code === "Space" && gameState === "over") {
      e.preventDefault();
      restartGame();
    }
  }

  function onKeyUp(e) {
    keys[e.code] = false;
  }

  function onResize() {
    resizeCanvas();
  }

  /* ═══════════════════════════ Init ═══════════════════════════ */

  function init() {
    // Event listeners
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);
    canvas.addEventListener("touchstart", (e) => { e.preventDefault(); });
    canvas.addEventListener("touchmove", (e) => { e.preventDefault(); });
    soundBtn.addEventListener("click", toggleSound);
    startBtn.addEventListener("click", startGame);
    restartBtn.addEventListener("click", restartGame);
    gameOverScreen.addEventListener("click", (e) => {
      if (e.target === gameOverScreen) restartGame();
    });

    // Mobile button controls — tap = jump, hold = move
    function bindSideBtn(btn, dirKey) {
      btn.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        if (gameState === "playing") {
          keys[dirKey] = true;
          if (!dino.jumping) { dino.jumping = true; dino.vy = JUMP_VEL; }
        }
      });
      btn.addEventListener("pointerup", (e) => {
        e.preventDefault();
        keys[dirKey] = false;
      });
      btn.addEventListener("pointerleave", () => { keys[dirKey] = false; });
      btn.addEventListener("pointercancel", () => { keys[dirKey] = false; });
    }
    bindSideBtn(btnLeft, "ArrowLeft");
    bindSideBtn(btnRight, "ArrowRight");

    btnMusic.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (gameState === "playing") cycleBGM();
    });

    // Start loading
    resizeCanvas();
    loadAssets();

    // Start loop (for background rendering behind overlays)
    animId = requestAnimationFrame(gameLoop);

    // Initial background draw
    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, W, H);
  }

  // Go!
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
