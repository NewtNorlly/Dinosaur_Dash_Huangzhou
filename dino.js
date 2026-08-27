/* ═══════════════════════════════════════════════
   恐龙快跑（黄州府）· Web Edition
   原版 Python/Pygame by 柴桑 → 网页版 by Hanako
   V2: 微信小游戏风格 · 四档难度 · 圣女果/蝙蝠/火光护盾
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
  const scoreCurrentEl = document.getElementById("score-current");
  const scoreTargetEl = document.getElementById("score-target");
  const soundBtn = document.getElementById("sound-toggle");
  const topCtrls = document.getElementById("top-controls");
  const startScreen = document.getElementById("startscreen");
  const gameOverScreen = document.getElementById("gameover");
  const finalScoreEl = document.getElementById("final-score");
  const finalTargetEl = document.getElementById("final-target");
  const resultIconEl = document.getElementById("result-icon");
  const resultTitleEl = document.getElementById("result-title");
  const resultMsgEl = document.getElementById("result-msg");
  const restartBtn = document.getElementById("restart");
  const btnHome = document.getElementById("btn-home");
  const startBtn = document.getElementById("start");
  const btnMusic = document.getElementById("btn-music");
  const btnFlight = document.getElementById("btn-flight");
  const mobileCtrls = document.getElementById("mobile-controls");
  const targetScoreInput = document.getElementById("target-score-input");
  const scoreMinusBtn = document.getElementById("score-minus");
  const scorePlusBtn = document.getElementById("score-plus");
  const diffBtns = document.querySelectorAll(".diff-btn");

  /* ── Constants ── */
  const W = 1600, H = 900;
  const GROUND_Y = H;
  const DINO_W = 160, DINO_H = 240;
  const DINO_X0 = (W - DINO_W) >> 1;
  const OBSTACLE_W = 48, OBSTACLE_H = 64;
  const OBSTACLE_Y = GROUND_Y - OBSTACLE_H;
  const JUMP_VEL = -48;
  const GRAVITY = 2.2;
  const MOVE_SPEED = 420;
  const BG_SCROLL_SPEED = 240;
  const SKY_COLOR = "#87cefa";
  const FLIGHT_Y = GROUND_Y - DINO_H - 260;
  const FLIGHT_SPEED = 900;

  // Air objects (tomato / bat) hover at ~1/4 screen height above ground
  const AIR_HEIGHT = H / 4;                        // 225px above ground
  const AIR_CENTER_Y = GROUND_Y - AIR_HEIGHT;      // y = 675
  const TOMATO_SIZE = 48;
  const BAT_W = 80, BAT_H = 56;
  const TOMATO_Y = AIR_CENTER_Y - TOMATO_SIZE / 2;
  const BAT_Y = AIR_CENTER_Y - BAT_H / 2;

  // Difficulty configurations
  const DIFFICULTY = {
    casual: {
      name: "休闲",
      bgSpeed: 240,
      obsMinSpeed: 320, obsMaxSpeed: 560,
      spawnMin: 0.9, spawnMax: 2.3,
      hasTomato: false, hasBat: false,
    },
    novice: {
      name: "上手",
      bgSpeed: 240,
      obsMinSpeed: 320, obsMaxSpeed: 560,
      spawnMin: 0.9, spawnMax: 2.3,
      hasTomato: true, hasBat: false,
      tomatoEvery: 5,   // 1 tomato per 5 obstacles
    },
    hooked: {
      name: "入坑",
      bgSpeed: 260,
      obsMinSpeed: 380, obsMaxSpeed: 600,
      spawnMin: 0.75, spawnMax: 1.9,
      hasTomato: true, hasBat: true,
      airChance: 0.5,       // chance an air object spawns instead of ground hedgehog
      batVsTomato: 0.6,     // within air objects: 60% bat, 40% tomato
    },
    expert: {
      name: "专家",
      bgSpeed: 300,
      obsMinSpeed: 480, obsMaxSpeed: 720,
      spawnMin: 0.55, spawnMax: 1.4,
      hasTomato: true, hasBat: true,
      airChance: 0.5,
      batVsTomato: 0.6,
    },
  };

  /* ── Landmark sequence ── */
  const LANDMARK_KEYS = [
    "HG2.0", "安国寺-removebg-preview", "HG3.0-removebg-preview",
    "遗爱湖建筑群-removebg-preview", "长江大桥-removebg-preview",
    "陈潭秋故居-removebg-preview", "壁纸-removebg-preview",
    "黄冈市博物馆-removebg-preview", "黄州师范学院-removebg-preview",
    "黄州文庙-removebg-preview", "栖霞楼-removebg-preview",
    "青云塔-removebg-preview", "柴小桑的背影"
  ];
  const COLUMN_KEY = "中式柱子";

  /* ── State ── */
  let assets = {};
  let bgSprites = [];
  let totalBgWidth = 0;
  let dino = null;
  let obstacles = [];   // ground hedgehogs
  let tomatoes = [];    // novice mode power-ups
  let bats = [];        // hooked/expert mode air obstacles
  let fireParticles = [];
  let score = 0;
  let gameState = "loading";
  let gameStarted = false;
  let bgX = 0;
  let spawnTimer = 0;
  let obstacleCounter = 0;   // counts ground obstacles for tomato spawning
  let soundOn = true;
  let bgmIndex = 0;
  let bgmAudio = null;
  let lastTime = 0;
  let keys = {};
  let moveInput = 0;
  let animId = null;
  const OVERLAY_EXIT_MS = 200;
  let flightState = "grounded";
  let selectedDifficulty = "casual";
  let targetScore = 10;
  let hasFireShield = false;
  let fireAnimTime = 0;
  let batFlapTime = 0;
  let currentDiff = null;
  let gameResult = null;   // "victory" | "defeat"
  let worldSpeed = 0;      // unified obstacle speed for hooked/expert

  /* ── Dynamic joystick state ── */
  let joyPointerId = null;
  let joyOriginX = 0;
  let joyOriginY = 0;
  let joyEl = null;
  let joyNub = null;
  const JOY_MAX_R = 48;
  const JOY_DEAD = 8;
  const JOY_ACTIVE = 10;
  const JOY_SPEED_BOOST = 1.7;

  function isLeftHalf(x) {
    return x < window.innerWidth * 0.5;
  }

  function createJoyElement(cx, cy) {
    if (joyEl) return;
    joyEl = document.createElement("div");
    joyEl.className = "dyn-joy";
    joyEl.style.left = cx + "px";
    joyEl.style.top = cy + "px";
    joyNub = document.createElement("div");
    joyNub.className = "dyn-joy-nub";
    joyEl.appendChild(joyNub);
    mobileCtrls.appendChild(joyEl);
    void joyEl.offsetWidth;
    joyEl.classList.add("active");
  }

  function destroyJoyElement() {
    if (!joyEl) return;
    joyEl.classList.remove("active", "pushed");
    var el = joyEl;
    joyEl = null;
    joyNub = null;
    el.addEventListener("transitionend", function cleanup() {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, { once: true });
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 200);
  }

  function cleanupJoystick() {
    moveInput = 0;
    joyPointerId = null;
    if (joyEl) {
      var el = joyEl;
      joyEl = null;
      joyNub = null;
      el.classList.remove("active", "pushed");
      if (el.parentNode) el.parentNode.removeChild(el);
    }
  }

  function updateJoyNub(dx, dy) {
    if (!joyNub) return;
    var dist = Math.sqrt(dx * dx + dy * dy);
    var r = Math.min(dist, JOY_MAX_R);
    var a = Math.atan2(dy, dx);
    var tx = Math.cos(a) * r;
    var ty = Math.sin(a) * r;
    joyNub.style.transform = "translate(calc(-50% + " + tx + "px), calc(-50% + " + ty + "px))";
    if (dist < JOY_DEAD || Math.abs(dx) < JOY_ACTIVE) {
      moveInput = 0;
      if (joyEl) joyEl.classList.remove("pushed");
    } else {
      var raw = dx / JOY_MAX_R * JOY_SPEED_BOOST;
      moveInput = Math.max(-1, Math.min(1, raw));
      if (joyEl) joyEl.classList.add("pushed");
    }
  }

  /* ═══════════════════════════ Asset Loading ═══════════════════════════ */

  const ASSET_LIST = [
    { key: "小恐龙-removebg-preview", path: "game/assets/小恐龙-removebg-preview.webp" },
    { key: "刺猬-removebg-preview", path: "game/assets/刺猬-removebg-preview.webp" },
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
    { key: "bgm0", path: "bgm/white-cat.mp3" },
    { key: "bgm1", path: "bgm/又见炊烟 - 邓丽君.mp3" },
    { key: "bgm2", path: "bgm/望春风 - 陈佳.mp3" },
  ];

  function loadAssets() {
    const total = ASSET_LIST.length + AUDIO_LIST.length;
    let loaded = 0;

    function progress() {
      loaded++;
      const pct = Math.round((loaded / total) * 100);
      progressEl.style.transform = "scaleX(" + (pct / 100) + ")";
      loadingText.textContent = "加载中… " + pct + "%";
      if (loaded >= total) {
        setTimeout(() => {
          loadingEl.classList.add("hidden");
          // Fully remove after fade transition
          setTimeout(() => { loadingEl.style.display = "none"; }, 350);
          buildBackgroundSprites();
          setupGame();
          showStartScreen();
        }, 300);
      }
    }

    ASSET_LIST.forEach(({ key, path }) => {
      const img = new Image();
      img.onload = () => {
        assets[key] = { img, w: img.naturalWidth, h: img.naturalHeight };
        progress();
      };
      img.onerror = () => {
        const enc = new Image();
        enc.onload = () => {
          assets[key] = { img: enc, w: enc.naturalWidth, h: enc.naturalHeight };
          progress();
        };
        enc.onerror = () => {
          assets[key] = { img: null, w: 100, h: 100 };
          progress();
        };
        enc.src = encodeURI(path);
      };
      img.src = path;
    });

    AUDIO_LIST.forEach(({ key, path }) => {
      const audio = new Audio();
      let settled = false;
      const finish = (ready) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        audio.removeEventListener("canplaythrough", onReady);
        audio.removeEventListener("loadeddata", onReady);
        audio.removeEventListener("error", onError);
        assets[key] = { path, audio, ready };
        progress();
      };
      const onReady = () => finish(true);
      const onError = () => finish(false);
      const timeoutId = setTimeout(() => finish(audio.readyState >= 2), 5000);
      audio.preload = "auto";
      audio.volume = 0.4;
      audio.loop = true;
      audio.addEventListener("canplaythrough", onReady, { once: true });
      audio.addEventListener("loadeddata", onReady, { once: true });
      audio.addEventListener("error", onError, { once: true });
      audio.src = encodeURI(path);
      audio.load();
    });
  }

  /* ═══════════════════════════ Background Sprites ═══════════════════════════ */

  function buildBackgroundSprites() {
    bgSprites = [];
    let x = 0;
    for (let i = 0; i < LANDMARK_KEYS.length; i++) {
      const lmKey = LANDMARK_KEYS[i];
      const lm = assets[lmKey];
      if (lm && lm.img) {
        const scale = H / lm.h;
        const sw = Math.round(lm.w * scale);
        bgSprites.push({ img: lm.img, x, w: sw, h: H, key: lmKey });
        x += sw;
      }
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
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
  }

  /* ═══════════════════════════ Audio ═══════════════════════════ */

  function playBGM() {
    if (bgmAudio && !bgmAudio.paused) return;
    stopBGM();
    if (!soundOn) return;
    const key = "bgm" + bgmIndex;
    const asset = assets[key];
    if (!asset || !asset.audio) return;
    bgmAudio = asset.audio;
    bgmAudio.volume = 0.4;
    bgmAudio.loop = true;
    var p = bgmAudio.play();
    if (p && typeof p.catch === "function") {
      p.catch(function () { bgmAudio = null; });
    }
  }

  function stopBGM() {
    if (bgmAudio) {
      bgmAudio.pause();
      bgmAudio.currentTime = 0;
      bgmAudio = null;
    }
  }

  function toggleSound() {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? "🔊" : "🔇";
    if (soundOn) { playBGM(); } else { stopBGM(); }
  }

  function cycleBGM() {
    stopBGM();
    bgmIndex = (bgmIndex + 1) % 3;
    pulseControl(btnMusic);
    if (soundOn && gameState === "playing") playBGM();
  }

  function isFlightActive() { return flightState !== "grounded"; }

  function updateFlightButton() {
    const active = isFlightActive();
    btnFlight.setAttribute("aria-pressed", active ? "true" : "false");
    btnFlight.setAttribute("aria-label", active ? "关闭飞翔模式" : "开启飞翔模式");
    btnFlight.title = active ? "关闭飞翔模式" : "开启飞翔模式";
    scoreEl.classList.toggle("is-paused", active);
  }

  function toggleFlightMode() {
    if (gameState !== "playing") return;
    if (flightState === "grounded" || flightState === "descending") {
      flightState = "ascending";
      dino.jumping = false;
      dino.vy = 0;
    } else {
      flightState = "descending";
    }
    updateFlightButton();
    pulseControl(btnFlight);
  }

  function pulseControl(element) {
    element.classList.add("is-switching");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => element.classList.remove("is-switching"));
    });
  }

  function showOverlay(element, animate) {
    element.hidden = false;
    element.classList.remove("is-leaving");
    if (!animate) { element.classList.remove("is-entering"); return; }
    element.classList.add("is-entering");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => element.classList.remove("is-entering"));
    });
  }

  function hideOverlay(element, animate, onHidden) {
    if (element.hidden) { if (onHidden) onHidden(); return; }
    if (!animate) {
      element.classList.remove("is-entering", "is-leaving");
      element.hidden = true;
      if (onHidden) onHidden();
      return;
    }
    element.classList.remove("is-entering");
    element.classList.add("is-leaving");
    setTimeout(() => {
      element.hidden = true;
      element.classList.remove("is-leaving");
      if (onHidden) onHidden();
    }, OVERLAY_EXIT_MS);
  }

  /* ═══════════════════════════ Game Objects ═══════════════════════════ */

  function resetDino() {
    dino = {
      x: DINO_X0, y: GROUND_Y - DINO_H,
      w: DINO_W, h: DINO_H,
      vy: 0, jumping: false,
    };
    flightState = "grounded";
    hasFireShield = false;
    fireParticles = [];
    updateFlightButton();
  }

  function randSpeed() {
    // In hooked/expert modes all obstacles share one speed so bats and
    // hedgehogs can never converge onto the same x-coordinate.
    if (currentDiff.hasBat) return worldSpeed;
    return currentDiff.obsMinSpeed + Math.random() * (currentDiff.obsMaxSpeed - currentDiff.obsMinSpeed);
  }

  // Minimum horizontal gap between any two obstacles (ground or air)
  function minSpawnGap() {
    return 340 + Math.random() * 200;
  }

  // Get the rightmost obstacle's x across all types (for spacing)
  function rightmostObstacleX() {
    let maxX = -Infinity;
    for (const o of obstacles) maxX = Math.max(maxX, o.x + o.w);
    for (const b of bats) maxX = Math.max(maxX, b.x + b.w);
    for (const t of tomatoes) maxX = Math.max(maxX, t.x + t.w);
    return maxX;
  }

  function spawnGroundObstacle() {
    obstacles.push({
      x: W + 20, y: OBSTACLE_Y,
      w: OBSTACLE_W, h: OBSTACLE_H,
      speed: randSpeed(), scored: false,
    });
  }

  function spawnBat() {
    bats.push({
      x: W + 20, y: BAT_Y,
      w: BAT_W, h: BAT_H,
      speed: randSpeed(), scored: false,
      flapOffset: Math.random() * Math.PI * 2,
    });
  }

  function spawnTomato() {
    // Don't spawn if a tomato or bat is still on screen (they never coexist)
    if (tomatoes.length > 0 || bats.length > 0) return;
    tomatoes.push({
      x: W + 20, y: TOMATO_Y,
      w: TOMATO_SIZE, h: TOMATO_SIZE,
      speed: randSpeed(),
      collected: false,
      bobOffset: Math.random() * Math.PI * 2,
    });
  }

  // Unified spawn for hooked/expert: ground hedgehog, air bat, or air tomato
  // Bats and tomatoes never coexist; bats and hedgehogs never share x
  function spawnMixedObstacle() {
    const rightmost = rightmostObstacleX();
    if (rightmost > W - minSpawnGap()) return; // too soon

    const roll = Math.random();
    if (roll < currentDiff.airChance) {
      // Air object: bat (obstacle) or tomato (power-up)
      if (Math.random() < currentDiff.batVsTomato) {
        // Only spawn bat if no tomato on screen
        if (tomatoes.length === 0) spawnBat();
        else spawnGroundObstacle();
      } else {
        // Only spawn tomato if no bat on screen
        if (bats.length === 0) spawnTomato();
        else spawnGroundObstacle();
      }
    } else {
      spawnGroundObstacle();
    }
  }

  /* ═══════════════════════════ Collision ═══════════════════════════ */

  function rectsCollide(a, b, margin) {
    margin = margin || 14;
    return (
      a.x + margin < b.x + b.w - margin &&
      a.x + a.w - margin > b.x + margin &&
      a.y + margin < b.y + b.h - margin &&
      a.y + a.h - margin > b.y + margin
    );
  }

  // Air collision uses a larger top margin on dino (sprite has transparent headroom)
  function airCollide(d, obj) {
    const topPad = 55, sidePad = 18, botPad = 20;
    return (
      d.x + sidePad < obj.x + obj.w - sidePad &&
      d.x + d.w - sidePad > obj.x + sidePad &&
      d.y + topPad < obj.y + obj.h - 8 &&
      d.y + d.h - botPad > obj.y + 8
    );
  }

  /* ═══════════════════════════ Fire Shield ═══════════════════════════ */

  function activateFireShield() {
    hasFireShield = true;
    fireParticles = [];
  }

  function deactivateFireShield() {
    hasFireShield = false;
    // burst particles
    for (let i = 0; i < 20; i++) {
      fireParticles.push({
        x: dino.x + dino.w / 2 + (Math.random() - 0.5) * dino.w * 0.6,
        y: dino.y + dino.h * 0.3 + Math.random() * dino.h * 0.4,
        vx: (Math.random() - 0.5) * 200,
        vy: -80 - Math.random() * 120,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        size: 8 + Math.random() * 12,
      });
    }
  }

  function updateFireParticles(dt) {
    for (let i = fireParticles.length - 1; i >= 0; i--) {
      const p = fireParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 300 * dt;
      p.life -= dt;
      if (p.life <= 0) fireParticles.splice(i, 1);
    }
  }

  /* ═══════════════════════════ Rendering ═══════════════════════════ */

  function drawBackground() {
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
    if (asset && asset.img) {
      ctx.drawImage(asset.img, dino.x, dino.y, dino.w, dino.h);
    } else {
      ctx.fillStyle = "#2d5a27";
      ctx.fillRect(dino.x, dino.y, dino.w, dino.h);
    }
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

  // Draw a cherry tomato (圣女果) with slight bobbing
  function drawTomato(t) {
    const bob = Math.sin(fireAnimTime * 3 + t.bobOffset) * 4;
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2 + bob;
    const r = t.w / 2;

    // Glow
    const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.8);
    glow.addColorStop(0, "rgba(255,100,80,0.25)");
    glow.addColorStop(1, "rgba(255,100,80,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
    grad.addColorStop(0, "#ff7a7a");
    grad.addColorStop(0.6, "#ee3a3a");
    grad.addColorStop(1, "#c41e1e");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Shine
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.beginPath();
    ctx.ellipse(cx - r * 0.3, cy - r * 0.3, r * 0.28, r * 0.16, -0.5, 0, Math.PI * 2);
    ctx.fill();

    // Green calyx (leaves on top)
    ctx.fillStyle = "#2d8a4e";
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.quadraticCurveTo(cx - r * 0.5, cy - r * 1.3, cx - r * 0.2, cy - r * 0.85);
    ctx.quadraticCurveTo(cx, cy - r * 1.0, cx + r * 0.2, cy - r * 0.85);
    ctx.quadraticCurveTo(cx + r * 0.5, cy - r * 1.3, cx, cy - r);
    ctx.fill();
    // Stem
    ctx.strokeStyle = "#2d6a3a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r);
    ctx.lineTo(cx, cy - r * 1.25);
    ctx.stroke();
  }

  // Draw a bat with flapping wings
  function drawBat(b) {
    const cx = b.x + b.w / 2;
    const cy = b.y + b.h / 2;
    const flap = Math.sin(batFlapTime * 8 + b.flapOffset) * 0.5 + 0.5; // 0..1
    const wingUp = flap * b.h * 0.35;

    // Wings
    ctx.fillStyle = "#3a2456";
    ctx.beginPath();
    ctx.moveTo(cx - b.w * 0.08, cy);
    ctx.quadraticCurveTo(cx - b.w * 0.3, cy - b.h * 0.45 - wingUp, cx - b.w * 0.5, cy - wingUp * 0.3);
    ctx.quadraticCurveTo(cx - b.w * 0.42, cy + b.h * 0.05, cx - b.w * 0.2, cy + b.h * 0.08);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx + b.w * 0.08, cy);
    ctx.quadraticCurveTo(cx + b.w * 0.3, cy - b.h * 0.45 - wingUp, cx + b.w * 0.5, cy - wingUp * 0.3);
    ctx.quadraticCurveTo(cx + b.w * 0.42, cy + b.h * 0.05, cx + b.w * 0.2, cy + b.h * 0.08);
    ctx.closePath();
    ctx.fill();

    // Body
    const bodyGrad = ctx.createRadialGradient(cx, cy - 2, 2, cx, cy, b.w * 0.18);
    bodyGrad.addColorStop(0, "#5a3a7a");
    bodyGrad.addColorStop(1, "#2a1840");
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, b.w * 0.14, b.h * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = "#3a2456";
    ctx.beginPath();
    ctx.moveTo(cx - 7, cy - b.h * 0.25);
    ctx.lineTo(cx - 11, cy - b.h * 0.48);
    ctx.lineTo(cx - 2, cy - b.h * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx + 7, cy - b.h * 0.25);
    ctx.lineTo(cx + 11, cy - b.h * 0.48);
    ctx.lineTo(cx + 2, cy - b.h * 0.3);
    ctx.closePath();
    ctx.fill();

    // Eyes
    ctx.fillStyle = "#ff3344";
    ctx.beginPath();
    ctx.arc(cx - 5, cy - b.h * 0.12, 2.5, 0, Math.PI * 2);
    ctx.arc(cx + 5, cy - b.h * 0.12, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Eye glint
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.beginPath();
    ctx.arc(cx - 4.5, cy - b.h * 0.14, 0.8, 0, Math.PI * 2);
    ctx.arc(cx + 5.5, cy - b.h * 0.14, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw fire shield aura around dino
  function drawFireShield() {
    if (!hasFireShield) return;
    const t = fireAnimTime;
    const cx = dino.x + dino.w / 2;
    const cy = dino.y + dino.h / 2;

    // Outer glow
    const glowR = dino.h * 0.75 + Math.sin(t * 6) * 8;
    const aura = ctx.createRadialGradient(cx, cy, dino.h * 0.2, cx, cy, glowR);
    aura.addColorStop(0, "rgba(255,120,30,0.15)");
    aura.addColorStop(0.6, "rgba(255,80,10,0.08)");
    aura.addColorStop(1, "rgba(255,60,0,0)");
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
    ctx.fill();

    // Flickering flame tongues around dino
    const flameCount = 9;
    for (let i = 0; i < flameCount; i++) {
      const angle = (i / flameCount) * Math.PI * 2 + t * 1.5;
      const wobble = Math.sin(t * 10 + i * 2.3) * 0.15;
      const dist = dino.w * 0.42 + Math.sin(t * 7 + i) * 10;
      const fx = cx + Math.cos(angle + wobble) * dist;
      const fy = dino.y + dino.h * 0.55 + Math.sin(angle + wobble) * dino.h * 0.42;
      const fSize = 16 + Math.sin(t * 12 + i * 1.7) * 8;

      const fg = ctx.createRadialGradient(fx, fy, 1, fx, fy - fSize * 0.3, fSize);
      fg.addColorStop(0, "rgba(255,240,150,0.9)");
      fg.addColorStop(0.3, "rgba(255,160,40,0.7)");
      fg.addColorStop(0.7, "rgba(255,70,10,0.4)");
      fg.addColorStop(1, "rgba(255,40,0,0)");
      ctx.fillStyle = fg;
      ctx.beginPath();
      ctx.arc(fx, fy, fSize, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Draw burst particles (after shield breaks)
  function drawFireParticles() {
    for (const p of fireParticles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const pg = ctx.createRadialGradient(p.x, p.y, 1, p.x, p.y, p.size);
      pg.addColorStop(0, "rgba(255,220,100," + (alpha * 0.9) + ")");
      pg.addColorStop(0.5, "rgba(255,120,30," + (alpha * 0.6) + ")");
      pg.addColorStop(1, "rgba(255,50,0,0)");
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawScore() {
    scoreCurrentEl.textContent = score;
    scoreTargetEl.textContent = targetScore;
  }

  /* ═══════════════════════════ Game Loop ═══════════════════════════ */

  function update(dt) {
    const cappedDt = Math.min(dt, 0.1);
    fireAnimTime += cappedDt;
    batFlapTime += cappedDt;

    // Background scroll
    bgX += currentDiff.bgSpeed * cappedDt;

    // Dino physics
    if (flightState === "ascending") {
      dino.y = Math.max(FLIGHT_Y, dino.y - FLIGHT_SPEED * cappedDt);
      if (dino.y <= FLIGHT_Y) flightState = "flying";
    } else if (flightState === "descending") {
      const groundY = GROUND_Y - dino.h;
      dino.y = Math.min(groundY, dino.y + FLIGHT_SPEED * cappedDt);
      if (dino.y >= groundY) {
        flightState = "grounded";
        dino.y = groundY;
        updateFlightButton();
      }
    } else if (dino.jumping) {
      dino.y += dino.vy * cappedDt * 60;
      dino.vy += GRAVITY * cappedDt * 60;
      if (dino.y >= GROUND_Y - dino.h) {
        dino.y = GROUND_Y - dino.h;
        dino.jumping = false;
        dino.vy = 0;
      }
    }

    dino.x += moveInput * MOVE_SPEED * cappedDt;
    dino.x = Math.max(0, Math.min(W - dino.w, dino.x));

    // ── Spawn logic per difficulty ──
    spawnTimer -= cappedDt;
    if (spawnTimer <= 0) {
      if (currentDiff.hasBat) {
        // Hooked / Expert: mixed ground + air, never overlapping x
        spawnMixedObstacle();
      } else {
        spawnGroundObstacle();
        obstacleCounter++;

        // Novice: tomato every N obstacles
        if (currentDiff.hasTomato && obstacleCounter % currentDiff.tomatoEvery === 0) {
          spawnTomato();
        }
      }
      spawnTimer = currentDiff.spawnMin + Math.random() * (currentDiff.spawnMax - currentDiff.spawnMin);
    }

    const flying = isFlightActive();

    // Update ground obstacles
    for (const obs of obstacles) {
      obs.x -= obs.speed * cappedDt;
      if (!obs.scored && obs.x + obs.w < dino.x) {
        obs.scored = true;
        if (!flying) { score++; drawScore(); }
      }
    }

    // Update bats
    for (const b of bats) {
      b.x -= b.speed * cappedDt;
      if (!b.scored && b.x + b.w < dino.x) {
        b.scored = true;
        if (!flying) { score++; drawScore(); }
      }
    }

    // Update tomatoes
    for (const t of tomatoes) {
      t.x -= t.speed * cappedDt;
    }

    // Cleanup off-screen
    obstacles = obstacles.filter(o => o.x + o.w > -50);
    bats = bats.filter(b => b.x + b.w > -50);
    tomatoes = tomatoes.filter(t => t.x + t.w > -50 && !t.collected);

    // Update fire particles
    updateFireParticles(cappedDt);

    // ── Collision: ground hedgehogs ──
    if (!flying) {
      for (let i = obstacles.length - 1; i >= 0; i--) {
        if (rectsCollide(dino, obstacles[i])) {
          if (hasFireShield) {
            // Shield absorbs the hit
            deactivateFireShield();
            obstacles.splice(i, 1);
          } else {
            endGame("defeat");
            return;
          }
        }
      }

      // Collision: bats (air obstacles)
      for (let i = bats.length - 1; i >= 0; i--) {
        if (airCollide(dino, bats[i])) {
          if (hasFireShield) {
            // Shield absorbs the bat hit too
            deactivateFireShield();
            bats.splice(i, 1);
          } else {
            endGame("defeat");
            return;
          }
        }
      }

      // Collision: tomatoes (collect)
      for (let i = tomatoes.length - 1; i >= 0; i--) {
        if (airCollide(dino, tomatoes[i])) {
          tomatoes[i].collected = true;
          activateFireShield();
          tomatoes.splice(i, 1);
        }
      }
    }

    // Victory check
    if (score >= targetScore) {
      endGame("victory");
      return;
    }
  }

  function render() {
    drawBackground();
    drawObstacles();
    for (const t of tomatoes) drawTomato(t);
    for (const b of bats) drawBat(b);
    drawDino();
    drawFireShield();
    drawFireParticles();
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
    currentDiff = DIFFICULTY[selectedDifficulty];
    // Unified speed for hooked/expert prevents bat–hedgehog x-overlap
    worldSpeed = currentDiff.hasBat
      ? currentDiff.obsMinSpeed + Math.random() * (currentDiff.obsMaxSpeed - currentDiff.obsMinSpeed)
      : 0;
    resetDino();
    obstacles = [];
    tomatoes = [];
    bats = [];
    fireParticles = [];
    score = 0;
    bgX = 0;
    spawnTimer = 0.6;
    obstacleCounter = 0;
    hasFireShield = false;
    fireAnimTime = 0;
    batFlapTime = 0;
    gameResult = null;
    drawScore();
  }

  function showStartScreen() {
    gameState = "start";
    showOverlay(startScreen, false);
    startBtn.disabled = false;
    gameOverScreen.hidden = true;
    mobileCtrls.style.display = "none";
    topCtrls.style.display = "none";
    scoreEl.style.display = "none";
    drawBackground();
    resetDino();
    drawDino();
  }

  function startGame(animateTransition) {
    if (gameState === "playing") return;
    // Read target score from input
    var val = parseInt(targetScoreInput.value, 10);
    if (isNaN(val) || val < 1) val = 10;
    targetScore = Math.min(999, Math.max(1, val));
    targetScoreInput.value = targetScore;

    gameStarted = true;
    gameState = "playing";
    startBtn.disabled = true;
    gameOverScreen.hidden = true;
    scoreEl.style.display = "flex";
    topCtrls.style.display = "";
    lastTime = 0;
    cleanupJoystick();
    setupGame();
    playBGM();
    hideOverlay(startScreen, animateTransition);
    mobileCtrls.style.display = "block";
  }

  function endGame(result) {
    gameState = "over";
    gameResult = result;
    stopBGM();
    cleanupJoystick();

    // Populate settlement screen
    finalScoreEl.textContent = score;
    finalTargetEl.textContent = targetScore;

    if (result === "victory") {
      resultIconEl.textContent = "🏆";
      resultTitleEl.textContent = "挑战成功！";
      resultTitleEl.className = "result-title victory";
      resultMsgEl.textContent = "太棒了！你成功达成了 " + targetScore + " 分目标，" +
        (currentDiff.name) + "难度通关！";
      finalScoreEl.classList.add("highlight");
    } else {
      resultIconEl.textContent = "💥";
      resultTitleEl.textContent = "游戏结束";
      resultTitleEl.className = "result-title defeat";
      var diff = targetScore - score;
      resultMsgEl.textContent = diff > 0
        ? "还差 " + diff + " 分就能达成目标，再接再厉！"
        : "别灰心，再来一局吧！";
      finalScoreEl.classList.remove("highlight");
    }

    showOverlay(gameOverScreen, true);
    scoreEl.style.display = "none";
    topCtrls.style.display = "none";
    mobileCtrls.style.display = "none";
  }

  function restartGame(animateTransition) {
    if (gameState === "restarting" || gameState === "playing") return;
    gameState = "restarting";
    if (!animateTransition) {
      hideOverlay(gameOverScreen, false);
      startGame(false);
      return;
    }
    hideOverlay(gameOverScreen, true, function () { startGame(false); });
  }

  function goHome() {
    if (gameState === "restarting") return;
    gameState = "start";
    gameStarted = false;
    stopBGM();
    cleanupJoystick();
    hideOverlay(gameOverScreen, true, function () {
      showStartScreen();
    });
  }

  /* ═══════════════════════════ Difficulty UI ═══════════════════════════ */

  function selectDifficulty(diff) {
    selectedDifficulty = diff;
    diffBtns.forEach(function (btn) {
      btn.classList.toggle("selected", btn.dataset.diff === diff);
    });
  }

  diffBtns.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      selectDifficulty(btn.dataset.diff);
    });
    btn.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
  });

  // Score stepper
  scoreMinusBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    var v = parseInt(targetScoreInput.value, 10) || 10;
    v = Math.max(1, v - 1);
    targetScoreInput.value = v;
  });
  scorePlusBtn.addEventListener("click", function (e) {
    e.stopPropagation();
    var v = parseInt(targetScoreInput.value, 10) || 10;
    v = Math.min(999, v + 1);
    targetScoreInput.value = v;
  });
  targetScoreInput.addEventListener("click", function (e) { e.stopPropagation(); });
  targetScoreInput.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
  targetScoreInput.addEventListener("change", function () {
    var v = parseInt(targetScoreInput.value, 10);
    if (isNaN(v) || v < 1) targetScoreInput.value = 10;
    else if (v > 999) targetScoreInput.value = 999;
  });

  /* ═══════════════════════════ Input ═══════════════════════════ */

  function onKeyDown(e) {
    keys[e.code] = true;
    if (e.code === "ArrowLeft" || e.code === "KeyA") moveInput = -1;
    if (e.code === "ArrowRight" || e.code === "KeyD") moveInput = 1;
    if (gameState === "playing") {
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        e.preventDefault();
        if (!isFlightActive() && !dino.jumping) {
          dino.jumping = true;
          dino.vy = JUMP_VEL;
        }
      }
      if (e.code === "KeyM" && !e.repeat) cycleBGM();
      if (e.code === "KeyN" && !e.repeat) { toggleSound(); pulseControl(soundBtn); }
      if (e.code === "KeyB" && !e.repeat) toggleFlightMode();
    }
    if (e.code === "Space" && gameState === "start") {
      e.preventDefault();
      startGame(false);
    }
    if (e.code === "Space" && gameState === "over") {
      e.preventDefault();
      restartGame(false);
    }
  }

  function onKeyUp(e) {
    keys[e.code] = false;
    if (e.code === "ArrowLeft" || e.code === "KeyA") {
      moveInput = keys["ArrowRight"] || keys["KeyD"] ? 1 : 0;
    }
    if (e.code === "ArrowRight" || e.code === "KeyD") {
      moveInput = keys["ArrowLeft"] || keys["KeyA"] ? -1 : 0;
    }
  }

  function onResize() { resizeCanvas(); }

  /* ═══════════════════════════ Init ═══════════════════════════ */

  function init() {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("resize", onResize);

    // Pointer events on touch surface
    mobileCtrls.addEventListener("pointerdown", function (e) {
      if (gameState !== "playing") return;
      e.preventDefault();
      if (isLeftHalf(e.clientX)) {
        if (joyPointerId !== null) return;
        joyPointerId = e.pointerId;
        joyOriginX = e.clientX;
        joyOriginY = e.clientY;
        createJoyElement(e.clientX, e.clientY);
        updateJoyNub(0, 0);
        mobileCtrls.setPointerCapture(e.pointerId);
      } else {
        if (!isFlightActive() && !dino.jumping) {
          dino.jumping = true;
          dino.vy = JUMP_VEL;
        }
      }
    });

    mobileCtrls.addEventListener("pointermove", function (e) {
      if (e.pointerId !== joyPointerId) return;
      e.preventDefault();
      updateJoyNub(e.clientX - joyOriginX, e.clientY - joyOriginY);
    });

    mobileCtrls.addEventListener("pointerup", function (e) {
      if (e.pointerId !== joyPointerId) return;
      e.preventDefault();
      joyPointerId = null;
      moveInput = 0;
      destroyJoyElement();
    });

    mobileCtrls.addEventListener("pointercancel", function (e) {
      if (e.pointerId !== joyPointerId) return;
      joyPointerId = null;
      moveInput = 0;
      destroyJoyElement();
    });

    canvas.addEventListener("touchstart", function (e) { e.preventDefault(); });
    canvas.addEventListener("touchmove", function (e) { e.preventDefault(); });

    // Audio buttons
    soundBtn.addEventListener("pointerdown", function (e) {
      e.preventDefault(); e.stopPropagation();
      toggleSound(); pulseControl(soundBtn);
    });

    // Start button
    startBtn.addEventListener("pointerdown", function (e) {
      e.preventDefault(); e.stopPropagation();
      startGame();
    });

    // Restart / Home
    restartBtn.addEventListener("pointerdown", function (e) {
      e.preventDefault(); e.stopPropagation();
      restartGame();
    });
    btnHome.addEventListener("pointerdown", function (e) {
      e.preventDefault(); e.stopPropagation();
      goHome();
    });

    // Music / Flight
    btnMusic.addEventListener("pointerdown", function (e) {
      e.preventDefault(); e.stopPropagation();
      if (gameState === "playing") cycleBGM();
    });
    btnFlight.addEventListener("pointerdown", function (e) {
      e.preventDefault(); e.stopPropagation();
      toggleFlightMode();
    });

    // Init difficulty selection
    selectDifficulty("casual");

    // Auto-start via URL hash: #casual / #novice / #hooked / #expert
    // Optional target score: #novice-20
    var hash = (window.location.hash || "").replace(/^#/, "");
    if (hash) {
      var parts = hash.split("-");
      var diff = parts[0];
      if (DIFFICULTY[diff]) {
        selectDifficulty(diff);
        if (parts[1]) {
          var tv = parseInt(parts[1], 10);
          if (!isNaN(tv) && tv >= 1) targetScoreInput.value = Math.min(999, tv);
        }
        var autoStart = function () {
          if (gameState === "start") startGame(false);
        };
        // Wait for loading to finish, then start
        var waitForLoad = setInterval(function () {
          if (gameState === "start") {
            clearInterval(waitForLoad);
            setTimeout(autoStart, 500);
          }
        }, 200);
      }
    }

    // Start
    resizeCanvas();
    loadAssets();
    animId = requestAnimationFrame(gameLoop);
    ctx.fillStyle = SKY_COLOR;
    ctx.fillRect(0, 0, W, H);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
