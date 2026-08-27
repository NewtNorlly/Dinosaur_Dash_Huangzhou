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
  const shieldBadge = document.getElementById("shield-badge");
  const shieldCountEl = document.getElementById("shield-count");
  const confettiCanvas = document.getElementById("confetti-canvas");
  const cctx = confettiCanvas ? confettiCanvas.getContext("2d") : null;

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

  // Air objects: tomatoes hover at ~1/4 screen height (easy to collect);
  // bats fly higher, near screen center (must jump to hit, but safe to stay grounded)
  const AIR_HEIGHT = H / 4;                        // 225px above ground (tomato)
  const AIR_CENTER_Y = GROUND_Y - AIR_HEIGHT;      // y = 675
  const TOMATO_SIZE = 48;
  const BAT_W = 80, BAT_H = 56;
  const TOMATO_Y = AIR_CENTER_Y - TOMATO_SIZE / 2;
  // Bats near screen center: center y=350 (reachable at jump peak, safe when grounded)
  const BAT_CENTER_Y = 350;
  const BAT_Y = BAT_CENTER_Y - BAT_H / 2;

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
  let fireShieldCount = 0;   // stackable shields: eat N tomatoes = N hits absorbed
  let fireAnimTime = 0;
  let batFlapTime = 0;
  let currentDiff = null;
  let gameResult = null;   // "victory" | "defeat"
  let worldSpeed = 0;      // unified obstacle speed for hooked/expert

  // ── Visual juice state ──
  let screenShake = 0;     // remaining shake magnitude (px)
  let screenFlash = 0;     // remaining flash alpha (0..1)
  let flashColor = "255,80,10";   // orange-red for shield break
  let clouds = [];         // parallax cloud layers
  let dustParticles = [];  // landing dust puffs
  let scorePopups = [];    // floating "+1" texts
  let confetti = [];       // victory confetti
  let sparkles = [];       // tomato collect / shield burst sparkles
  let idleTime = 0;        // time since last ground movement (for idle anim)
  let wasJumping = false;  // previous-frame jump state (for landing detection)
  let dinoSquash = 0;      // 0 = normal, >0 = squash (landing), <0 = stretch (jumping)
  let scoreBumpTimer = 0;  // cooldown for score bump animation

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

  /* ═══════════════════════════ Clouds (parallax) ═══════════════════════════ */

  function initClouds() {
    clouds = [];
    for (let i = 0; i < 6; i++) {
      clouds.push({
        x: Math.random() * W,
        y: 40 + Math.random() * 200,
        scale: 0.6 + Math.random() * 0.7,
        speed: 12 + Math.random() * 20,
        opacity: 0.5 + Math.random() * 0.35,
      });
    }
  }

  function drawCloud(c) {
    const s = c.scale;
    ctx.fillStyle = "rgba(255,255,255," + c.opacity + ")";
    ctx.beginPath();
    ctx.arc(c.x, c.y, 22 * s, 0, Math.PI * 2);
    ctx.arc(c.x + 26 * s, c.y - 8 * s, 28 * s, 0, Math.PI * 2);
    ctx.arc(c.x + 55 * s, c.y, 20 * s, 0, Math.PI * 2);
    ctx.arc(c.x + 30 * s, c.y + 6 * s, 24 * s, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ═══════════════════════════ Visual Effects ═══════════════════════════ */

  function triggerShake(amount) { screenShake = Math.max(screenShake, amount); }

  function triggerFlash(alpha, color) {
    screenFlash = Math.max(screenFlash, alpha);
    if (color) flashColor = color;
  }

  function spawnDust(x, y) {
    for (let i = 0; i < 8; i++) {
      dustParticles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y,
        vx: -40 - Math.random() * 80,
        vy: -20 - Math.random() * 50,
        life: 0.35 + Math.random() * 0.2,
        maxLife: 0.55,
        size: 6 + Math.random() * 10,
      });
    }
  }

  function spawnScorePopup(x, y, text, color) {
    scorePopups.push({
      x: x, y: y,
      vy: -60,
      life: 0.8,
      maxLife: 0.8,
      text: text || "+1",
      color: color || "#07c160",
    });
  }

  function spawnSparkles(x, y, count, color) {
    for (let i = 0; i < (count || 12); i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 160;
      sparkles.push({
        x: x, y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 40,
        life: 0.4 + Math.random() * 0.3,
        maxLife: 0.7,
        size: 3 + Math.random() * 5,
        color: color || null,
      });
    }
  }

  function spawnConfetti() {
    const colors = ["#07c160", "#ff976a", "#1989fa", "#ffd200", "#ee0a24", "#7c3aed"];
    for (let i = 0; i < 80; i++) {
      confetti.push({
        x: W / 2 + (Math.random() - 0.5) * 200,
        y: H / 2 - 100,
        vx: (Math.random() - 0.5) * 400,
        vy: -200 - Math.random() * 300,
        gravity: 600 + Math.random() * 200,
        life: 2.5 + Math.random() * 1.5,
        maxLife: 4,
        size: 6 + Math.random() * 8,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 10,
      });
    }
  }

  function updateDust(dt) {
    for (let i = dustParticles.length - 1; i >= 0; i--) {
      const p = dustParticles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 120 * dt;
      p.life -= dt;
      if (p.life <= 0) dustParticles.splice(i, 1);
    }
  }

  function updateScorePopups(dt) {
    for (let i = scorePopups.length - 1; i >= 0; i--) {
      const p = scorePopups[i];
      p.y += p.vy * dt;
      p.vy *= 0.96;
      p.life -= dt;
      if (p.life <= 0) scorePopups.splice(i, 1);
    }
  }

  function updateSparkles(dt) {
    for (let i = sparkles.length - 1; i >= 0; i--) {
      const p = sparkles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.vx *= 0.96;
      p.life -= dt;
      if (p.life <= 0) sparkles.splice(i, 1);
    }
  }

  function updateConfetti(dt) {
    for (let i = confetti.length - 1; i >= 0; i--) {
      const p = confetti[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.vx *= 0.99;
      p.rot += p.vrot * dt;
      p.life -= dt;
      if (p.life <= 0 || p.y > H + 50) confetti.splice(i, 1);
    }
  }

  function drawDust() {
    for (const p of dustParticles) {
      const alpha = Math.max(0, p.life / p.maxLife) * 0.5;
      ctx.fillStyle = "rgba(210,200,180," + alpha + ")";
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawScorePopups() {
    ctx.textAlign = "center";
    ctx.font = "bold 36px 'Times New Roman', 'SimSun', '宋体', serif";
    for (const p of scorePopups) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 4;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawSparkles() {
    for (const p of sparkles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      const col = p.color || "255,220,100";
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
      g.addColorStop(0, "rgba(" + col + "," + alpha + ")");
      g.addColorStop(1, "rgba(" + col + ",0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (0.5 + alpha * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /* ═══════════════════════════ Scaling ═══════════════════════════ */

  function resizeCanvas() {
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    // Confetti canvas shares the same 1600×900 internal resolution
    confettiCanvas.width = W;
    confettiCanvas.height = H;
    confettiCanvas.style.width = window.innerWidth + "px";
    confettiCanvas.style.height = window.innerHeight + "px";
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
    fireShieldCount = 0;
    fireParticles = [];
    dinoSquash = 0;
    wasJumping = false;
    idleTime = 0;
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
    fireShieldCount++;
    // Don't clear existing particles when stacking; just add a fresh burst
    if (dino) {
      spawnSparkles(dino.x + dino.w / 2, dino.y + dino.h / 2, 16, "255,180,40");
    }
    updateShieldBadge();
  }

  function consumeFireShield() {
    fireShieldCount--;
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
    // Screen flash + sparkles + shake for impact feedback
    triggerFlash(0.35, "255,100,20");
    triggerShake(8);
    spawnSparkles(dino.x + dino.w / 2, dino.y + dino.h / 2, 10, "255,120,30");
    updateShieldBadge();
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

  function updateShieldBadge() {
    if (fireShieldCount > 0) {
      shieldBadge.hidden = false;
      shieldCountEl.textContent = fireShieldCount;
    } else {
      shieldBadge.hidden = true;
    }
  }

  /* ═══════════════════════════ Rendering ═══════════════════════════ */

  function drawBackground() {
    // Sky gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H);
    skyGrad.addColorStop(0, "#87cefa");
    skyGrad.addColorStop(0.6, "#b8e0f5");
    skyGrad.addColorStop(1, "#d4edf8");
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // Parallax clouds
    for (const c of clouds) drawCloud(c);

    if (!totalBgWidth) return;
    const offset = bgX % totalBgWidth;
    for (const spr of bgSprites) {
      for (let copy = 0; copy < 2; copy++) {
        const sx = spr.x - offset + copy * totalBgWidth;
        if (sx + spr.w <= 0 || sx >= W) continue;
        ctx.drawImage(spr.img, sx, 0, spr.w, spr.h);
      }
    }

    // Ground shadow line
    ctx.fillStyle = "rgba(0,0,0,0.08)";
    ctx.fillRect(0, GROUND_Y - 4, W, 8);
  }

  function drawDinoShadow() {
    if (!dino) return;
    const groundY = GROUND_Y;
    const heightAboveGround = groundY - (dino.y + dino.h);
    const t = Math.min(1, heightAboveGround / 300);
    const shadowW = dino.w * (1 - t * 0.4);
    const shadowH = 14 * (1 - t * 0.5);
    const alpha = 0.25 * (1 - t * 0.6);
    const cx = dino.x + dino.w / 2;
    ctx.fillStyle = "rgba(0,0,0," + alpha + ")";
    ctx.beginPath();
    ctx.ellipse(cx, groundY - 2, shadowW / 2, shadowH / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawDino() {
    const asset = assets["小恐龙-removebg-preview"];
    // Squash & stretch: squash on landing (positive), stretch on jump (negative)
    const sq = dinoSquash;
    const scaleX = 1 + sq * 0.15;
    const scaleY = 1 - sq * 0.2;
    const drawW = dino.w * scaleX;
    const drawH = dino.h * scaleY;
    const drawX = dino.x + (dino.w - drawW) / 2;
    const drawY = dino.y + (dino.h - drawH);

    // Idle breathing bob when grounded
    let idleBob = 0;
    if (!dino.jumping && !isFlightActive() && gameState === "playing") {
      idleBob = Math.sin(idleTime * 2) * 2;
    }

    if (asset && asset.img) {
      ctx.drawImage(asset.img, drawX, drawY + idleBob, drawW, drawH);
    } else {
      ctx.fillStyle = "#2d5a27";
      ctx.fillRect(drawX, drawY + idleBob, drawW, drawH);
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
    if (fireShieldCount <= 0) return;
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
    // Bump animation on score change
    if (scoreBumpTimer <= 0) {
      scoreBumpTimer = 0.12;
      scoreCurrentEl.classList.remove("bump");
      void scoreCurrentEl.offsetWidth; // reflow to restart animation
      scoreCurrentEl.classList.add("bump");
      setTimeout(function () { scoreCurrentEl.classList.remove("bump"); }, 150);
    }
  }

  /* ═══════════════════════════ Game Loop ═══════════════════════════ */

  function update(dt) {
    const cappedDt = Math.min(dt, 0.1);
    fireAnimTime += cappedDt;
    batFlapTime += cappedDt;
    idleTime += cappedDt;
    if (scoreBumpTimer > 0) scoreBumpTimer -= cappedDt;

    // Decay screen effects
    if (screenShake > 0) screenShake = Math.max(0, screenShake - cappedDt * 40);
    if (screenFlash > 0) screenFlash = Math.max(0, screenFlash - cappedDt * 2.5);

    // Parallax clouds
    for (const c of clouds) {
      c.x -= c.speed * cappedDt;
      if (c.x + 80 * c.scale < 0) {
        c.x = W + 40;
        c.y = 40 + Math.random() * 200;
        c.scale = 0.6 + Math.random() * 0.7;
        c.opacity = 0.5 + Math.random() * 0.35;
      }
    }

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
      // Stretch on ascent, squash slightly on descent
      if (dino.vy < 0) dinoSquash = -0.3;
      else dinoSquash = 0.1;
      dino.y += dino.vy * cappedDt * 60;
      dino.vy += GRAVITY * cappedDt * 60;
      if (dino.y >= GROUND_Y - dino.h) {
        dino.y = GROUND_Y - dino.h;
        dino.jumping = false;
        dino.vy = 0;
        // Landing: squash + dust
        dinoSquash = 0.5;
        spawnDust(dino.x + dino.w / 2, GROUND_Y - 4);
      }
    } else {
      idleTime += 0; // already incremented above
    }

    // Detect landing moment (was in air, now on ground)
    if (wasJumping && !dino.jumping && !isFlightActive()) {
      // Landing effects already applied above
    }
    wasJumping = dino.jumping;

    // Decay squash/stretch
    dinoSquash *= Math.pow(0.001, cappedDt); // fast exponential decay
    if (Math.abs(dinoSquash) < 0.01) dinoSquash = 0;

    dino.x += moveInput * MOVE_SPEED * cappedDt;
    dino.x = Math.max(0, Math.min(W - dino.w, dino.x));
    if (moveInput !== 0) idleTime = 0;

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
        if (!flying) {
          score++;
          spawnScorePopup(obs.x + obs.w / 2, obs.y - 10, "+1", "#07c160");
          drawScore();
        }
      }
    }

    // Update bats
    for (const b of bats) {
      b.x -= b.speed * cappedDt;
      if (!b.scored && b.x + b.w < dino.x) {
        b.scored = true;
        if (!flying) {
          score++;
          spawnScorePopup(b.x + b.w / 2, b.y - 10, "+1", "#7c3aed");
          drawScore();
        }
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

    // Update particles
    updateFireParticles(cappedDt);
    updateDust(cappedDt);
    updateScorePopups(cappedDt);
    updateSparkles(cappedDt);
    updateConfetti(cappedDt);

    // ── Collision: ground hedgehogs ──
    if (!flying) {
      for (let i = obstacles.length - 1; i >= 0; i--) {
        if (rectsCollide(dino, obstacles[i])) {
          if (fireShieldCount > 0) {
            // Shield absorbs the hit (consumes one layer)
            consumeFireShield();
            spawnSparkles(obstacles[i].x + obstacles[i].w / 2, obstacles[i].y + obstacles[i].h / 2, 8, "255,160,40");
            obstacles.splice(i, 1);
          } else {
            triggerShake(16);
            triggerFlash(0.5, "255,50,50");
            endGame("defeat");
            return;
          }
        }
      }

      // Collision: bats (air obstacles)
      for (let i = bats.length - 1; i >= 0; i--) {
        if (airCollide(dino, bats[i])) {
          if (fireShieldCount > 0) {
            // Shield absorbs the bat hit too (consumes one layer)
            consumeFireShield();
            spawnSparkles(bats[i].x + bats[i].w / 2, bats[i].y + bats[i].h / 2, 8, "120,60,180");
            bats.splice(i, 1);
          } else {
            triggerShake(16);
            triggerFlash(0.5, "255,50,50");
            endGame("defeat");
            return;
          }
        }
      }

      // Collision: tomatoes (collect — stacks shield count)
      for (let i = tomatoes.length - 1; i >= 0; i--) {
        if (airCollide(dino, tomatoes[i])) {
          tomatoes[i].collected = true;
          activateFireShield();
          spawnScorePopup(tomatoes[i].x + tomatoes[i].w / 2, tomatoes[i].y - 10,
            fireShieldCount > 1 ? "护盾 x" + fireShieldCount + "!" : "护盾!", "#ff6a00");
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
    ctx.save();

    // Screen shake
    if (screenShake > 0) {
      const sx = (Math.random() - 0.5) * screenShake * 2;
      const sy = (Math.random() - 0.5) * screenShake * 2;
      ctx.translate(sx, sy);
    }

    drawBackground();
    drawDinoShadow();
    drawObstacles();
    for (const t of tomatoes) drawTomato(t);
    for (const b of bats) drawBat(b);
    drawDust();
    drawDino();
    drawFireShield();
    drawFireParticles();
    drawSparkles();
    drawScorePopups();

    ctx.restore();

    // Screen flash overlay (not affected by shake)
    if (screenFlash > 0) {
      ctx.fillStyle = "rgba(" + flashColor + "," + screenFlash + ")";
      ctx.fillRect(0, 0, W, H);
    }
  }

  /* ── Confetti renders on a top-layer canvas above all HTML overlays ── */
  function renderConfetti() {
    if (!cctx) return;
    cctx.clearRect(0, 0, W, H);
    if (confetti.length === 0) return;
    for (const p of confetti) {
      const alpha = Math.min(1, p.life / 0.5);
      cctx.globalAlpha = alpha;
      cctx.save();
      cctx.translate(p.x, p.y);
      cctx.rotate(p.rot);
      cctx.fillStyle = p.color;
      cctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      cctx.restore();
    }
    cctx.globalAlpha = 1;
  }

  function gameLoop(timestamp) {
    if (lastTime === 0) lastTime = timestamp;
    const dt = Math.min((timestamp - lastTime) / 1000, 0.1);
    lastTime = timestamp;

    if (gameState === "playing") {
      update(dt);
      render();
      renderConfetti();
    } else if (gameState === "over") {
      // Keep animating confetti and screen effects on settlement screen
      fireAnimTime += dt;
      if (screenShake > 0) screenShake = Math.max(0, screenShake - dt * 40);
      if (screenFlash > 0) screenFlash = Math.max(0, screenFlash - dt * 2.5);
      updateConfetti(dt);
      updateSparkles(dt);
      updateFireParticles(dt);
      render();
      renderConfetti();
    } else {
      // No confetti outside playing/over states
      cctx.clearRect(0, 0, W, H);
    }
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
    dustParticles = [];
    scorePopups = [];
    confetti = [];
    sparkles = [];
    score = 0;
    bgX = 0;
    spawnTimer = 0.6;
    obstacleCounter = 0;
    fireShieldCount = 0;
    fireAnimTime = 0;
    batFlapTime = 0;
    idleTime = 0;
    screenShake = 0;
    screenFlash = 0;
    scoreBumpTimer = 0;
    gameResult = null;
    initClouds();
    updateShieldBadge();
    cctx.clearRect(0, 0, W, H);
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
    shieldBadge.hidden = true;
    cctx.clearRect(0, 0, W, H);
    initClouds();
    drawBackground();
    resetDino();
    drawDinoShadow();
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
      gameOverScreen.querySelector(".wx-card--result").classList.add("wx-card--victory");
      gameOverScreen.querySelector(".wx-card--result").classList.remove("wx-card--defeat");
      resultMsgEl.textContent = "太棒了！你成功达成了 " + targetScore + " 分目标，" +
        (currentDiff.name) + "难度通关！";
      finalScoreEl.classList.add("highlight");
      // Celebration!
      spawnConfetti();
      triggerFlash(0.3, "255,215,0");
    } else {
      resultIconEl.textContent = "💥";
      resultTitleEl.textContent = "游戏结束";
      resultTitleEl.className = "result-title defeat";
      gameOverScreen.querySelector(".wx-card--result").classList.add("wx-card--defeat");
      gameOverScreen.querySelector(".wx-card--result").classList.remove("wx-card--victory");
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
          dinoSquash = -0.4;
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
          dinoSquash = -0.4;
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
