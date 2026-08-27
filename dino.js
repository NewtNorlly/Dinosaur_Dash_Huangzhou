/* ═══════════════════════════════════════════════════════════════
   恐龙快跑 — 四种玩法横屏小游戏
   休闲(跑酷) / 上手(迷宫) / 入坑(平台跳跃) / 专家(传送迷岛)
   ═══════════════════════════════════════════════════════════════ */
(function () {
'use strict';

/* ─── Constants ─── */
const W = 1600, H = 900;
const DINO_URL = 'images/小恐龙-removebg-preview.png';
const BGM_URL = 'bgm/white-cat.mp3';
const GROUND_Y = 820;
const GRAVITY = 0.55;

// roundRect polyfill
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    if (typeof r === 'number') r = [r, r, r, r];
    this.moveTo(x + r[0], y);
    this.arcTo(x + w, y, x + w, y + h, r[1]);
    this.arcTo(x + w, y + h, x, y + h, r[2]);
    this.arcTo(x, y + h, x, y, r[3]);
    this.arcTo(x, y, x + w, y, r[0]);
    this.closePath();
    return this;
  };
}

/* ─── DOM ─── */
const $ = id => document.getElementById(id);
const canvas = $('game'), ctx = canvas.getContext('2d');
const confettiC = $('confetti-canvas'), cctx = confettiC.getContext('2d');
const loadingEl = $('loading'), progressEl = $('loading-progress'), loadingText = $('loading-text');
const startScreen = $('startscreen');
const casualPopup = $('casual-popup');
const levelPopup = $('level-popup');
const pausePopup = $('pause-popup');
const gameOverScreen = $('gameover');
const scoreEl = $('score'), scoreCurrent = $('score-current'), scoreTarget = $('score-target');
const shieldBadge = $('shield-badge'), shieldCountEl = $('shield-count');
const levelIndicator = $('level-indicator'), levelNameEl = $('level-name');
const topCtrls = $('top-controls');
const soundBtn = $('sound-toggle'), flightBtn = $('btn-flight'), pauseBtn = $('btn-pause');
const mobileCtrls = $('mobile-controls');
const resultIcon = $('result-icon'), resultTitle = $('result-title'), resultMsg = $('result-msg');
const finalScoreEl = $('final-score'), finalTargetEl = $('final-target'), scoreBox = $('result-score-box');
const targetInput = $('target-score-input');

/* ─── I18N ─── */
const I18N = {
  zh: {
    loading: '加载中…', rotate_hint: '请横屏使用', game_title: '恐龙快跑',
    game_subtitle: '四种玩法 · 横屏冒险',
    mode_casual: '休闲', mode_casual_desc: '横版跑酷',
    mode_novice: '上手', mode_novice_desc: '空中迷宫',
    mode_hooked: '入坑', mode_hooked_desc: '平台跳跃',
    mode_expert: '专家', mode_expert_desc: '传送迷岛',
    hint_keyboard: '⌨️ 方向键/WASD', hint_space: '空格跳跃', hint_touch: '📱 触屏摇杆',
    target_score: '目标分数', target_hint: '设置你的挑战目标',
    start_game: '开始游戏', back: '返回', back_home: '返回首页', play_again: '再来一次',
    paused: '已暂停', resume: '继续', quit_to_menu: '返回首页',
    victory: '通关！', game_over: '游戏结束', final_score: '本次得分',
    score_label: '分数', flight_label: ' · 飞翔中', score_pop: '+1',
    shield_pop: '护盾!', shield_pop_multi: '护盾 x{n}!',
    victory_msg: '太棒了！达成 {target} 分目标，{diff}通关！',
    defeat_msg_near: '还差 {diff} 分，再接再厉！', defeat_msg: '别灰心，再来一局！',
    select_level: '选择关卡', maze_desc: '穿越迷宫，躲避刺猬和蝙蝠，到达右下角热气球',
    platformer_desc: '跳跃闯关，穿越管道，登上终点热气球',
    portal_desc: '利用传送门和跳床，到达右上角热气球',
    level_n: '第 {n} 关', casual_desc: '横版跑酷：躲避刺猬和蝙蝠，吃圣女果获得护盾',
    flight: '飞行', mode_casual_settings: '休闲模式',
    victory_maze: '成功走出迷宫！', victory_plat: '登上热气球，飞走啦！', victory_portal: '传送成功，完美通关！',
  },
  en: {
    loading: 'Loading…', rotate_hint: 'Please rotate', game_title: 'Dino Dash',
    game_subtitle: '4 Modes · Landscape Adventure',
    mode_casual: 'Casual', mode_casual_desc: 'Runner',
    mode_novice: 'Novice', mode_novice_desc: 'Maze',
    mode_hooked: 'Hooked', mode_hooked_desc: 'Platformer',
    mode_expert: 'Expert', mode_expert_desc: 'Portals',
    hint_keyboard: '⌨️ Arrows / WASD', hint_space: 'Space to jump', hint_touch: '📱 Touch joystick',
    target_score: 'Target Score', target_hint: 'Set your goal',
    start_game: 'Start', back: 'Back', back_home: 'Home', play_again: 'Play Again',
    paused: 'Paused', resume: 'Resume', quit_to_menu: 'Quit to Menu',
    victory: 'Victory!', game_over: 'Game Over', final_score: 'Score',
    score_label: 'Score', flight_label: ' · Flying', score_pop: '+1',
    shield_pop: 'Shield!', shield_pop_multi: 'Shield x{n}!',
    victory_msg: 'Great! {target} points in {diff}!',
    defeat_msg_near: '{diff} points to go!', defeat_msg: 'Try again!',
    select_level: 'Select Level', maze_desc: 'Navigate the maze, avoid hedgehogs & bats, reach the balloon',
    platformer_desc: 'Jump through pipes, reach the hot air balloon',
    portal_desc: 'Use portals & trampolines to reach the balloon',
    level_n: 'Level {n}', casual_desc: 'Runner: dodge hedgehogs & bats, collect tomatoes for shields',
    flight: 'Fly', mode_casual_settings: 'Casual Mode',
    victory_maze: 'You escaped the maze!', victory_plat: 'Balloon escape!', victory_portal: 'Portal master!',
  },
  fr: {
    loading: 'Chargement…', rotate_hint: 'Mode paysage', game_title: 'Dino Dash',
    game_subtitle: '4 Modes · Aventure',
    mode_casual: 'Décontracté', mode_casual_desc: 'Course',
    mode_novice: 'Novice', mode_novice_desc: 'Labyrinthe',
    mode_hooked: 'Captivant', mode_hooked_desc: 'Plateformes',
    mode_expert: 'Expert', mode_expert_desc: 'Portails',
    hint_keyboard: '⌨️ Flèches / WASD', hint_space: 'Espace pour sauter', hint_touch: '📱 Joystick tactile',
    target_score: 'Objectif', target_hint: 'Définissez votre but',
    start_game: 'Commencer', back: 'Retour', back_home: 'Accueil', play_again: 'Rejouer',
    paused: 'Pause', resume: 'Reprendre', quit_to_menu: 'Menu',
    victory: 'Victoire !', game_over: 'Fin du jeu', final_score: 'Score',
    score_label: 'Score', flight_label: ' · En vol', score_pop: '+1',
    shield_pop: 'Bouclier !', shield_pop_multi: 'Bouclier x{n} !',
    victory_msg: 'Bravo ! {target} points en {diff} !',
    defeat_msg_near: 'Plus que {diff} points !', defeat_msg: 'Réessayez !',
    select_level: 'Niveau', maze_desc: 'Traversez le labyrinthe, évitez hérissons et chauves-souris',
    platformer_desc: 'Sautez à travers les tuyaux, atteignez la montgolfière',
    portal_desc: 'Utilisez portails et trampolines',
    level_n: 'Niveau {n}', casual_desc: 'Course : évitez les obstacles, collectez des tomates',
    flight: 'Vol', mode_casual_settings: 'Mode Décontracté',
    victory_maze: 'Tu as réussi !', victory_plat: 'Montgolfière !', victory_portal: 'Maître des portails !',
  },
  de: {
    loading: 'Laden…', rotate_hint: 'Querformat', game_title: 'Dino Dash',
    game_subtitle: '4 Modi · Abenteuer',
    mode_casual: 'Gelegenheit', mode_casual_desc: 'Runner',
    mode_novice: 'Anfänger', mode_novice_desc: 'Labyrinth',
    mode_hooked: 'Fesselnd', mode_hooked_desc: 'Plattformer',
    mode_expert: 'Experte', mode_expert_desc: 'Portale',
    hint_keyboard: '⌨️ Pfeile / WASD', hint_space: 'Leertaste zum Springen', hint_touch: '📱 Touch-Joystick',
    target_score: 'Zielpunktzahl', target_hint: 'Ziel setzen',
    start_game: 'Start', back: 'Zurück', back_home: 'Startseite', play_again: 'Nochmal',
    paused: 'Pausiert', resume: 'Weiter', quit_to_menu: 'Menü',
    victory: 'Sieg!', game_over: 'Spiel vorbei', final_score: 'Punktzahl',
    score_label: 'Punkte', flight_label: ' · Fliegt', score_pop: '+1',
    shield_pop: 'Schild!', shield_pop_multi: 'Schild x{n}!',
    victory_msg: 'Geschafft! {target} Punkte im {diff}!',
    defeat_msg_near: 'Noch {diff} Punkte!', defeat_msg: 'Versuch es nochmal!',
    select_level: 'Level wählen', maze_desc: 'Navigiere durch das Labyrinth, erreiche den Ballon',
    platformer_desc: 'Springe durch Röhren zum Heißluftballon',
    portal_desc: 'Nutze Portale und Trampoline',
    level_n: 'Level {n}', casual_desc: 'Runner: Hindernissen ausweichen, Tomaten sammeln',
    flight: 'Fliegen', mode_casual_settings: 'Gelegenheitsmodus',
    victory_maze: 'Du hast es geschafft!', victory_plat: 'Heißluftballon!', victory_portal: 'Portal-Meister!',
  }
};
let lang = 'zh';
function t(key, params) {
  let s = (I18N[lang] && I18N[lang][key]) || I18N.zh[key] || key;
  if (params) for (const k in params) s = s.replace('{' + k + '}', params[k]);
  return s;
}
function applyLanguage(l) {
  lang = l;
  document.documentElement.lang = l === 'zh' ? 'zh-CN' : l;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.getAttribute('data-i18n');
    if (I18N[l][k]) el.textContent = I18N[l][k];
  });
  document.querySelectorAll('.lang-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.lang === l));
  document.documentElement.style.setProperty('--flight-label', '"' + t('flight_label') + '"');
  try { localStorage.setItem('dino_lang', l); } catch (e) {}
}

/* ─── State ─── */
let gameState = 'loading'; // loading, start, playing, paused, over
let mode = null, levelIdx = 0, handler = null;
let score = 0, targetScore = 10, shields = 0;
let careMode = false;
let bgm = null, bgmPlaying = false, bgmEnabled = true;
let dinoImg = new Image();
let popups = [];
let confettiParts = [];
let animFrame = null;
let lastTime = 0;

/* ─── Canvas resize ─── */
function resize() {
  canvas.width = W; canvas.height = H;
  confettiC.width = W; confettiC.height = H;
  const vw = window.innerWidth, vh = window.innerHeight;
  const sc = Math.min(vw / W, vh / H);
  const cw = Math.round(W * sc), ch = Math.round(H * sc);
  [canvas, confettiC].forEach(c => {
    c.style.width = cw + 'px'; c.style.height = ch + 'px';
    c.style.left = (vw - cw) / 2 + 'px'; c.style.top = (vh - ch) / 2 + 'px';
  });
}
window.addEventListener('resize', resize);

/* ─── Audio ─── */
function initBGM() {
  bgm = new Audio(BGM_URL);
  bgm.loop = true; bgm.volume = 0.4;
}
function playBGM() {
  if (!bgm || !bgmEnabled) return;
  bgm.play().then(() => { bgmPlaying = true; updateSoundIcon(); }).catch(() => {});
}
function stopBGM() {
  if (!bgm) return;
  bgm.pause(); bgmPlaying = false; updateSoundIcon();
}
function toggleBGM() {
  bgmEnabled = !bgmEnabled;
  if (bgmEnabled) playBGM(); else stopBGM();
  try { localStorage.setItem('dino_bgm', bgmEnabled ? '1' : '0'); } catch (e) {}
}
function updateSoundIcon() {
  soundBtn.innerHTML = bgmEnabled
    ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 7.97v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>'
    : '<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>';
}

/* ─── Input ─── */
const keys = {};
let moveX = 0, moveY = 0, jumpQueued = false;
let joyId = null, joyOX = 0, joyOY = 0, joyDX = 0, joyDY = 0;
let joyEl = null, nubEl = null;
let joyMode = 'horizontal'; // 'horizontal' or 'full'

function onKeyDown(e) {
  keys[e.code] = true;
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveX = -1;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') moveX = 1;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') { moveY = -1; if (handler && handler.onJump) handler.onJump(); }
  if (e.code === 'ArrowDown' || e.code === 'KeyS') moveY = 1;
  if (e.code === 'Space' && handler && handler.onJump) { e.preventDefault(); handler.onJump(); }
  if (e.code === 'Escape' && gameState === 'playing') pauseGame();
  else if (e.code === 'Escape' && gameState === 'paused') resumeGame();
}
function onKeyUp(e) {
  keys[e.code] = false;
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') moveX = (keys['ArrowRight'] || keys['KeyD']) ? 1 : 0;
  if (e.code === 'ArrowRight' || e.code === 'KeyD') moveX = (keys['ArrowLeft'] || keys['KeyA']) ? -1 : 0;
  if (e.code === 'ArrowUp' || e.code === 'KeyW') moveY = (keys['ArrowDown'] || keys['KeyS']) ? 1 : 0;
  if (e.code === 'ArrowDown' || e.code === 'KeyS') moveY = (keys['ArrowUp'] || keys['KeyW']) ? -1 : 0;
}
window.addEventListener('keydown', onKeyDown);
window.addEventListener('keyup', onKeyUp);

function isLeftHalf(cx) { return cx < window.innerWidth / 2; }
function createJoy(x, y) {
  joyEl = document.createElement('div'); joyEl.className = 'joystick-base';
  joyEl.style.left = x + 'px'; joyEl.style.top = y + 'px';
  nubEl = document.createElement('div'); nubEl.className = 'joystick-nub';
  joyEl.appendChild(nubEl); document.body.appendChild(joyEl);
}
function destroyJoy() { if (joyEl) { joyEl.remove(); joyEl = null; nubEl = null; } }
function updateJoy(dx, dy) {
  const max = 40;
  const len = Math.sqrt(dx * dx + dy * dy);
  const cl = len > max ? max / len : 1;
  const nx = dx * cl, ny = dy * cl;
  if (nubEl) nubEl.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
  const dead = 12;
  if (joyMode === 'full') {
    moveX = Math.abs(nx) > dead ? (nx > 0 ? 1 : -1) : (keys['ArrowLeft']||keys['KeyA'] ? -1 : keys['ArrowRight']||keys['KeyD'] ? 1 : 0);
    moveY = Math.abs(ny) > dead ? (ny > 0 ? 1 : -1) : 0;
  } else {
    moveX = Math.abs(nx) > dead ? (nx > 0 ? 1 : -1) : (keys['ArrowLeft']||keys['KeyA'] ? -1 : keys['ArrowRight']||keys['KeyD'] ? 1 : 0);
  }
  joyDX = nx; joyDY = ny;
}

mobileCtrls.addEventListener('pointerdown', e => {
  if (gameState !== 'playing') return;
  e.preventDefault();
  if (isLeftHalf(e.clientX)) {
    if (joyId !== null) return;
    joyId = e.pointerId; joyOX = e.clientX; joyOY = e.clientY;
    createJoy(e.clientX, e.clientY); updateJoy(0, 0);
    mobileCtrls.setPointerCapture(e.pointerId);
  } else {
    if (handler && handler.onJump) handler.onJump();
  }
});
mobileCtrls.addEventListener('pointermove', e => {
  if (e.pointerId !== joyId) return;
  e.preventDefault();
  updateJoy(e.clientX - joyOX, e.clientY - joyOY);
});
function endJoy(e) {
  if (e.pointerId !== joyId) return;
  joyId = null; moveX = 0; moveY = 0; joyDX = 0; joyDY = 0;
  destroyJoy();
}
mobileCtrls.addEventListener('pointerup', endJoy);
mobileCtrls.addEventListener('pointercancel', endJoy);

/* ─── Drawing primitives ─── */
function drawDino(x, y, w, h, facing, squash) {
  if (!dinoImg.complete) return;
  ctx.save();
  const sx = facing === 'left' ? -1 : 1;
  const sq = squash || 0;
  const drawW = w * (1 + sq * 0.15), drawH = h * (1 - sq * 0.15);
  const dx = x + (w - drawW) / 2, dy = y + (h - drawH);
  ctx.translate(dx + drawW / 2, dy + drawH / 2);
  ctx.scale(sx, 1);
  ctx.drawImage(dinoImg, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

function drawShieldAura(x, y, w, h, frame) {
  ctx.save();
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.15);
  ctx.strokeStyle = `rgba(255,140,0,${0.6 * pulse})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = 'rgba(255,100,0,0.8)';
  ctx.shadowBlur = 15 * pulse;
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + h / 2, w * 0.65 * pulse, h * 0.6 * pulse, 0, 0, Math.PI * 2);
  ctx.stroke();
  // fire particles
  for (let i = 0; i < 5; i++) {
    const a = frame * 0.08 + i * 1.25;
    const px = x + w / 2 + Math.cos(a) * w * 0.55;
    const py = y + h / 2 + Math.sin(a) * h * 0.5;
    ctx.fillStyle = `rgba(255,${100 + Math.random() * 100},0,0.7)`;
    ctx.beginPath(); ctx.arc(px, py, 2 + Math.random() * 2, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawHedgehog(x, y, w, h, frame) {
  ctx.save();
  ctx.translate(x + w / 2, y + h);
  const bob = Math.sin(frame * 0.2) * 1;
  // body
  ctx.fillStyle = '#8B6F47';
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.35 + bob, w * 0.45, h * 0.35, 0, 0, Math.PI * 2);
  ctx.fill();
  // spikes
  ctx.fillStyle = '#5D4E37';
  for (let i = -3; i <= 3; i++) {
    const sx = i * w * 0.11;
    ctx.beginPath();
    ctx.moveTo(sx - 3, -h * 0.55 + bob);
    ctx.lineTo(sx, -h * 0.85 + bob);
    ctx.lineTo(sx + 3, -h * 0.55 + bob);
    ctx.fill();
  }
  // face
  ctx.fillStyle = '#A08060';
  ctx.beginPath();
  ctx.ellipse(w * 0.3, -h * 0.3 + bob, w * 0.18, h * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  // eye
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(w * 0.35, -h * 0.38 + bob, 1.5, 0, Math.PI * 2); ctx.fill();
  // nose
  ctx.fillStyle = '#333';
  ctx.beginPath(); ctx.arc(w * 0.46, -h * 0.25 + bob, 2, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBat(x, y, w, h, frame) {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  const flap = Math.sin(frame * 0.4) * 0.5;
  // wings
  ctx.fillStyle = '#4A2C6D';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(-w * 0.4, -h * 0.3 - flap * h * 0.3, -w * 0.5, h * 0.1);
  ctx.quadraticCurveTo(-w * 0.25, 0, 0, h * 0.1);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(w * 0.4, -h * 0.3 - flap * h * 0.3, w * 0.5, h * 0.1);
  ctx.quadraticCurveTo(w * 0.25, 0, 0, h * 0.1);
  ctx.fill();
  // body
  ctx.fillStyle = '#6B3FA0';
  ctx.beginPath();
  ctx.ellipse(0, 0, w * 0.15, h * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();
  // ears
  ctx.beginPath();
  ctx.moveTo(-4, -h * 0.2); ctx.lineTo(-6, -h * 0.38); ctx.lineTo(-1, -h * 0.25);
  ctx.moveTo(4, -h * 0.2); ctx.lineTo(6, -h * 0.38); ctx.lineTo(1, -h * 0.25);
  ctx.fill();
  // eyes
  ctx.fillStyle = '#FFD700';
  ctx.beginPath(); ctx.arc(-3, -h * 0.05, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(3, -h * 0.05, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTomato(x, y, size, frame) {
  ctx.save();
  const pulse = 0.9 + 0.1 * Math.sin(frame * 0.12);
  const cx = x + size / 2, cy = y + size / 2;
  // glow
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.8);
  grad.addColorStop(0, 'rgba(255,80,50,0.3)');
  grad.addColorStop(1, 'rgba(255,80,50,0)');
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.8 * pulse, 0, Math.PI * 2); ctx.fill();
  // body
  ctx.fillStyle = '#E63946';
  ctx.beginPath(); ctx.arc(cx, cy, size * 0.38 * pulse, 0, Math.PI * 2); ctx.fill();
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath(); ctx.arc(cx - size * 0.1, cy - size * 0.12, size * 0.1, 0, Math.PI * 2); ctx.fill();
  // leaves
  ctx.fillStyle = '#2D8C3C';
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + i * 0.4 - 0.8;
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * size * 0.15, cy - size * 0.32 + Math.sin(a) * size * 0.08,
      size * 0.08, size * 0.04, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawBalloon(x, y, frame) {
  ctx.save();
  const bob = Math.sin(frame * 0.05) * 5;
  const by = y + bob;
  // balloon body
  const grad = ctx.createLinearGradient(x - 30, by - 40, x + 30, by + 20);
  grad.addColorStop(0, '#FF6B6B'); grad.addColorStop(1, '#E63946');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(x, by - 15, 28, 35, 0, 0, Math.PI * 2);
  ctx.fill();
  // stripes
  ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.ellipse(x + i * 10, by - 15, 28 - Math.abs(i) * 8, 35, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  // knot
  ctx.fillStyle = '#C1121F';
  ctx.beginPath(); ctx.moveTo(x - 4, by + 18); ctx.lineTo(x + 4, by + 18); ctx.lineTo(x, by + 26); ctx.fill();
  // rope
  ctx.strokeStyle = '#888'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, by + 26);
  ctx.quadraticCurveTo(x + 8, by + 45, x - 2, by + 65);
  ctx.stroke();
  // basket
  ctx.fillStyle = '#8B6F47';
  ctx.fillRect(x - 10, by + 62, 20, 14);
  ctx.strokeStyle = '#5D4E37'; ctx.lineWidth = 1;
  ctx.strokeRect(x - 10, by + 62, 20, 14);
  ctx.restore();
}

function drawPipe(x, y, w, h) {
  ctx.save();
  // pipe body
  ctx.fillStyle = '#2D8C3C';
  ctx.fillRect(x + 4, y, w - 8, h);
  // pipe rim
  ctx.fillStyle = '#34A84A';
  ctx.fillRect(x - 2, y, w + 4, 16);
  ctx.fillStyle = '#2D8C3C';
  ctx.fillRect(x - 2, y + 12, w + 4, 6);
  // highlight
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillRect(x + 8, y + 18, 4, h - 22);
  ctx.restore();
}

function drawPlatform(x, y, w, h) {
  ctx.save();
  // grass top
  ctx.fillStyle = '#4CAF50';
  ctx.fillRect(x, y, w, 8);
  // dirt
  ctx.fillStyle = '#8B6F47';
  ctx.fillRect(x, y + 8, w, h - 8);
  // dirt texture
  ctx.fillStyle = '#7A5F3A';
  for (let i = 0; i < w; i += 20) {
    ctx.fillRect(x + i + 5, y + 14, 6, 4);
    ctx.fillRect(x + i + 12, y + 24, 4, 4);
  }
  // grass highlight
  ctx.fillStyle = '#66BB6A';
  ctx.fillRect(x, y, w, 3);
  ctx.restore();
}

function drawIsland(x, y, w, h) {
  ctx.save();
  // grass top
  ctx.fillStyle = '#4CAF50';
  ctx.beginPath();
  ctx.moveTo(x + 8, y);
  ctx.lineTo(x + w - 8, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + 8);
  ctx.lineTo(x + w, y + h - 12);
  ctx.quadraticCurveTo(x + w, y + h, x + w - 12, y + h);
  ctx.lineTo(x + 12, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - 12);
  ctx.lineTo(x, y + 8);
  ctx.quadraticCurveTo(x, y, x + 8, y);
  ctx.fill();
  // dirt body
  ctx.fillStyle = '#8B6F47';
  ctx.fillRect(x + 2, y + 10, w - 4, h - 14);
  // bottom rocks
  ctx.fillStyle = '#6B5235';
  ctx.beginPath();
  ctx.moveTo(x, y + h - 12);
  ctx.lineTo(x + 8, y + h); ctx.lineTo(x + w - 8, y + h); ctx.lineTo(x + w, y + h - 12);
  ctx.fill();
  // grass highlight
  ctx.fillStyle = '#66BB6A';
  ctx.fillRect(x + 4, y + 2, w - 8, 4);
  ctx.restore();
}

function drawPortal(x, y, r, frame) {
  ctx.save();
  // outer glow
  const g1 = ctx.createRadialGradient(x, y, r * 0.3, x, y, r * 1.3);
  g1.addColorStop(0, 'rgba(80,30,120,0.6)');
  g1.addColorStop(1, 'rgba(80,30,120,0)');
  ctx.fillStyle = g1;
  ctx.beginPath(); ctx.arc(x, y, r * 1.3, 0, Math.PI * 2); ctx.fill();
  // ring
  ctx.strokeStyle = '#9C27B0'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  // swirl
  ctx.strokeStyle = 'rgba(180,100,220,0.7)'; ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    const off = frame * 0.04 + i * 2.1;
    for (let a = 0; a < Math.PI * 3; a += 0.2) {
      const rr = r * (0.9 - a / (Math.PI * 3) * 0.7);
      const px = x + Math.cos(a + off) * rr;
      const py = y + Math.sin(a + off) * rr;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // center
  ctx.fillStyle = '#1A0030';
  ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawTrampoline(x, y, w) {
  ctx.save();
  // base
  ctx.fillStyle = '#555';
  ctx.fillRect(x + 4, y + 8, w - 8, 6);
  // legs
  ctx.strokeStyle = '#555'; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 8, y + 14); ctx.lineTo(x + 2, y + 22);
  ctx.moveTo(x + w - 8, y + 14); ctx.lineTo(x + w - 2, y + 22);
  ctx.stroke();
  // mat
  ctx.fillStyle = '#1989fa';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 6, w / 2, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4FC3F7';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, y + 4, w / 2 - 4, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawStartPipe(x, y) {
  ctx.save();
  ctx.fillStyle = '#2D8C3C';
  ctx.fillRect(x, y - 60, 50, 60);
  ctx.fillStyle = '#34A84A';
  ctx.fillRect(x - 4, y - 68, 58, 14);
  ctx.restore();
}

/* ─── Popups (floating score text) ─── */
function spawnPopup(x, y, text, color) {
  popups.push({ x: x, y: y, text: text, color: color, life: 50, vy: -2 });
}
function updatePopups() {
  for (let i = popups.length - 1; i >= 0; i--) {
    const p = popups[i];
    p.y += p.vy; p.life--;
    if (p.life <= 0) popups.splice(i, 1);
  }
}
function drawPopups() {
  ctx.save();
  ctx.font = 'bold 28px "Fredoka", sans-serif';
  ctx.textAlign = 'center';
  popups.forEach(p => {
    ctx.globalAlpha = Math.min(1, p.life / 25);
    ctx.fillStyle = p.color;
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
    ctx.strokeText(p.text, p.x, p.y);
    ctx.fillText(p.text, p.x, p.y);
  });
  ctx.restore();
}

/* ─── Confetti ─── */
function spawnConfetti() {
  confettiParts = [];
  const colors = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#FF6B9D', '#B983FF'];
  for (let i = 0; i < 120; i++) {
    confettiParts.push({
      x: W / 2 + (Math.random() - 0.5) * 400,
      y: H / 2, vx: (Math.random() - 0.5) * 12,
      vy: -Math.random() * 15 - 5,
      size: 6 + Math.random() * 8, color: colors[i % colors.length],
      rot: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.3,
      life: 180
    });
  }
}
function updateConfetti() {
  for (let i = confettiParts.length - 1; i >= 0; i--) {
    const p = confettiParts[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.3; p.rot += p.vr; p.life--;
    if (p.life <= 0) confettiParts.splice(i, 1);
  }
}
function drawConfetti() {
  cctx.clearRect(0, 0, W, H);
  confettiParts.forEach(p => {
    cctx.save(); cctx.translate(p.x, p.y); cctx.rotate(p.rot);
    cctx.globalAlpha = Math.min(1, p.life / 40);
    cctx.fillStyle = p.color;
    cctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    cctx.restore();
  });
}

/* ─── Shared clouds ─── */
function drawClouds(offset, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha || 0.8;
  ctx.fillStyle = '#fff';
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 340 - offset * 0.15) % (W + 300) + W + 300) % (W + 300) - 150;
    const cy = 50 + (i % 3) * 55;
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.arc(cx + 22, cy - 10, 22, 0, Math.PI * 2);
    ctx.arc(cx + 44, cy, 24, 0, Math.PI * 2);
    ctx.arc(cx + 20, cy + 6, 20, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/* ─── Collision util ─── */
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/* ─── Shield helpers ─── */
function addShield() {
  shields++;
  shieldBadge.hidden = false;
  shieldCountEl.textContent = shields;
}
function useShield() {
  if (shields > 0) { shields--; shieldCountEl.textContent = shields; if (shields === 0) shieldBadge.hidden = true; return true; }
  return false;
}
function resetShields() {
  shields = 0; shieldBadge.hidden = true; shieldCountEl.textContent = 0;
}

/* ═══════════════════════════════════════════════════════════════
   MAZE GENERATION (Novice mode)
   ═══════════════════════════════════════════════════════════════ */
const MAZE_COLS = 18, MAZE_ROWS = 32, CELL = 28;
const MAZE_W = MAZE_COLS * CELL, MAZE_H = MAZE_ROWS * CELL;
const MAZE_OX = (W - MAZE_W) / 2, MAZE_OY = (H - MAZE_H) / 2;

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateMaze(seed) {
  const rng = mulberry32(seed);
  const grid = [];
  for (let y = 0; y < MAZE_ROWS; y++) { grid[y] = []; for (let x = 0; x < MAZE_COLS; x++) grid[y][x] = 1; }
  function carve(x, y) {
    grid[y][x] = 0;
    const dirs = [[0, -2], [0, 2], [-2, 0], [2, 0]];
    for (let i = dirs.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [dirs[i], dirs[j]] = [dirs[j], dirs[i]]; }
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (nx > 0 && nx < MAZE_COLS - 1 && ny > 0 && ny < MAZE_ROWS - 1 && grid[ny][nx] === 1) {
        grid[y + dy / 2][x + dx / 2] = 0; carve(nx, ny);
      }
    }
  }
  carve(1, 1);
  grid[1][0] = 0; // entrance
  grid[2][0] = 0;
  grid[MAZE_ROWS - 2][MAZE_COLS - 1] = 0; // exit
  grid[MAZE_ROWS - 3][MAZE_COLS - 1] = 0;
  return grid;
}

function buildMazeEntities(grid, seed) {
  const rng = mulberry32(seed + 1000);
  const hedgehogs = [], bats = [], tomatoes = [];
  // Find horizontal corridors (3+ path cells in a row)
  for (let y = 1; y < MAZE_ROWS - 1; y++) {
    let run = 0, runStart = 0;
    for (let x = 0; x < MAZE_COLS; x++) {
      if (grid[y][x] === 0) { if (run === 0) runStart = x; run++; }
      else { if (run >= 4 && rng() < 0.3) hedgehogs.push({ gx: runStart + 1, gy: y, dir: 1, range: run - 2, axis: 'h' }); run = 0; }
    }
    if (run >= 4 && rng() < 0.3) hedgehogs.push({ gx: runStart + 1, gy: y, dir: 1, range: run - 2, axis: 'h' });
  }
  // Find vertical corridors
  for (let x = 1; x < MAZE_COLS - 1; x++) {
    let run = 0, runStart = 0;
    for (let y = 0; y < MAZE_ROWS; y++) {
      if (grid[y][x] === 0) { if (run === 0) runStart = y; run++; }
      else { if (run >= 4 && rng() < 0.25) hedgehogs.push({ gx: x, gy: runStart + 1, dir: 1, range: run - 2, axis: 'v' }); run = 0; }
    }
    if (run >= 4 && rng() < 0.25) hedgehogs.push({ gx: x, gy: runStart + 1, dir: 1, range: run - 2, axis: 'v' });
  }
  // Limit hedgehogs
  while (hedgehogs.length > 5) hedgehogs.splice(Math.floor(rng() * hedgehogs.length), 1);
  // 2 bats flying diagonally
  for (let i = 0; i < 2; i++) {
    bats.push({
      x: MAZE_OX + CELL * (3 + i * 8), y: MAZE_OY + CELL * (5 + i * 10),
      vx: 1.2 + i * 0.3, vy: 0.9 + i * 0.2, w: 30, h: 22
    });
  }
  // Tomatoes at dead ends
  for (let y = 1; y < MAZE_ROWS - 1; y++) {
    for (let x = 1; x < MAZE_COLS - 1; x++) {
      if (grid[y][x] !== 0) continue;
      let neighbors = 0;
      if (grid[y - 1][x] === 0) neighbors++;
      if (grid[y + 1][x] === 0) neighbors++;
      if (grid[y][x - 1] === 0) neighbors++;
      if (grid[y][x + 1] === 0) neighbors++;
      if (neighbors === 1 && rng() < 0.6) tomatoes.push({ gx: x, gy: y, collected: false });
    }
  }
  // Add some tomatoes at intersections too
  for (let y = 2; y < MAZE_ROWS - 2; y += 4) {
    for (let x = 2; x < MAZE_COLS - 2; x += 3) {
      if (grid[y][x] === 0 && rng() < 0.2) tomatoes.push({ gx: x, gy: y, collected: false });
    }
  }
  while (tomatoes.length > 6) tomatoes.splice(Math.floor(rng() * tomatoes.length), 1);
  if (tomatoes.length < 2) tomatoes.push({ gx: 5, gy: 5, collected: false });
  return { hedgehogs, bats, tomatoes };
}

/* ═══════════════════════════════════════════════════════════════
   PLATFORMER LEVELS (Hooked mode)
   ═══════════════════════════════════════════════════════════════ */
const PLAT_LEVELS = [
  // [width, pits, plats, pipes, hedges, bats, toms, balloonX]
  [3000, [], [], [], [[500,100],[1200,120],[2000,100]], [], [[900,730],[1700,730]], 2800],
  [3200, [[1100,1280]], [[1050,700,280]], [], [[600,100],[1800,120],[2500,100]], [], [[1400,690],[2200,730]], 3000],
  [3400, [[900,1080],[2100,2280]], [[850,700,280],[2050,700,280]], [[2600,80]], [[500,100],[1500,100],[2900,100]], [[1800,520,200]], [[1100,690],[2400,690]], 3200],
  [3600, [[800,980],[1800,2000],[2800,2980]], [[750,700,280],[1750,680,300],[2750,700,280]], [[1300,90],[2400,80]], [[400,100],[1100,100],[2100,100],[3100,100]], [[1600,500,200]], [[950,690],[2000,660],[3000,690]], 3400],
  [3800, [[700,900],[1600,1800],[2600,2800]], [[650,690,300],[1550,670,300],[2550,690,300]], [[1100,100],[2200,90],[3200,80]], [[350,100],[1000,100],[1900,100],[2900,100],[3400,100]], [[1400,480,250],[2400,520,200]], [[850,680],[1800,660],[2800,680]], 3600],
  [4000, [[600,800],[1400,1620],[2400,2620],[3300,3480]], [[550,690,300],[1350,670,320],[2350,690,300],[3250,670,280]], [[1000,110],[2000,100],[2900,90]], [[300,80],[900,80],[1700,80],[2700,80],[3600,80]], [[1200,460,250],[2200,500,250]], [[700,680],[1600,660],[2600,680],[3400,660]], 3800],
  [4200, [[500,720],[1200,1440],[2100,2320],[3100,3300]], [[450,680,320],[1150,660,340],[2050,680,320],[3050,660,300]], [[900,120],[1700,110],[2700,100],[3600,90]], [[250,80],[800,80],[1500,80],[2400,80],[3400,80],[3900,80]], [[1100,440,250],[2000,480,250],[2900,460,250]], [[600,670],[1450,650],[2500,670],[3500,650]], 4000],
  [4400, [[500,740],[1100,1360],[1900,2140],[2800,3040],[3700,3900]], [[450,670,340],[1050,650,360],[1850,670,340],[2750,650,340],[3650,670,300]], [[850,130],[1600,120],[2400,130],[3300,110]], [[250,80],[750,80],[1400,80],[2200,80],[3100,80],[4000,80]], [[1000,420,280],[1900,460,280],[3000,440,280]], [[600,660],[1350,640],[2300,660],[3200,640],[4100,660]], 4200],
  [4600, [[400,660],[1000,1260],[1700,1960],[2500,2760],[3400,3620]], [[350,660,360],[950,640,380],[1650,660,360],[2450,640,380],[3350,660,340]], [[750,140],[1400,130],[2200,140],[3000,130],[3900,120]], [[200,80],[650,80],[1250,80],[2000,80],[2800,80],[3700,80],[4200,80]], [[900,400,280],[1800,440,280],[2800,420,280],[3800,460,250]], [[500,650],[1200,630],[2100,650],[3100,630],[4000,650]], 4400],
  [4800, [[400,680],[900,1180],[1500,1800],[2300,2600],[3200,3480],[4100,4340]], [[350,650,380],[850,630,400],[1450,650,380],[2250,630,400],[3150,650,380],[4050,630,340]], [[700,150],[1250,140],[2000,150],[2800,140],[3700,130]], [[200,80],[600,80],[1100,80],[1800,80],[2600,80],[3500,80],[4400,80]], [[800,390,280],[1600,430,280],[2500,410,280],[3600,450,280]], [[500,640],[1100,620],[1900,640],[2900,620],[3900,640]], 4600],
];

function buildGround(pits, levelW) {
  const segs = []; let x = 0;
  const sorted = [...pits].sort((a, b) => a[0] - b[0]);
  for (const [ps, pe] of sorted) { if (ps > x) segs.push([x, ps - x]); x = pe; }
  if (x < levelW) segs.push([x, levelW - x]);
  return segs;
}

/* ═══════════════════════════════════════════════════════════════
   PORTAL LEVELS (Expert mode)
   Each: [islands, trampolines, portals(pairs), bats, balloon[x,y]]
   islands: [x,y,w], trampolines: [x,y] (on island), portals: [[x1,y1],[x2,y2]]
   ═══════════════════════════════════════════════════════════════ */
const PORTAL_LEVELS = [
  // L1: simple staircase
  [[[160,720,120],[320,640,120],[480,560,120],[640,480,120],[820,400,120],[1000,320,120],[1180,250,120],[1380,180,140]], [], [], [[700,440,200]], [1460,100]],
  // L2: trampoline big jump
  [[[160,720,120],[340,720,120],[560,720,100],[760,500,120],[940,420,120],[1120,340,120],[1320,250,120],[1480,180,120]], [[560,720]], [], [[450,620,200],[1000,380,200]], [1520,100]],
  // L3: first portal
  [[[140,740,110],[320,740,100],[520,680,110],[720,600,110],[1000,420,120],[1180,340,120],[1360,260,120],[1500,180,120]], [[520,680]], [[[720,560],[1000,380]]], [[600,550,200],[1100,300,200]], [1540,100]],
  // L4: two trampolines
  [[[140,740,110],[300,680,100],[480,600,100],[680,520,100],[900,350,110],[1080,280,110],[1260,220,110],[1440,170,120]], [[300,680],[680,520]], [[[480,560],[900,310]]], [[550,480,200],[1000,250,200]], [1500,90]],
  // L5: two portal pairs
  [[[120,760,100],[280,700,100],[460,640,100],[660,560,100],[900,400,110],[1080,330,110],[1260,260,110],[1440,190,120]], [[460,640],[1080,330]], [[[280,660],[900,360]],[[660,520],[1260,220]]], [[500,500,200],[990,300,200]], [1500,100]],
  // L6: more complex
  [[[120,760,100],[300,700,100],[500,620,100],[700,540,100],[880,460,100],[1100,350,110],[1280,280,110],[1460,200,120]], [[300,700],[880,460]], [[[500,580],[1100,310]],[[700,500],[1280,240]]], [[400,560,200],[800,400,200],[1200,250,200]], [1520,110]],
  // L7: 3 trampolines
  [[[100,770,100],[280,720,100],[460,650,100],[640,570,100],[820,490,100],[1020,400,110],[1200,320,110],[1380,240,110],[1520,170,110]], [[280,720],[640,570],[1020,400]], [[[460,610],[1020,360]],[[820,450],[1380,200]]], [[380,600,200],[750,450,200],[1150,280,200]], [1560,90]],
  // L8: 3 portal pairs
  [[[100,770,100],[260,720,100],[440,650,100],[620,570,100],[800,500,100],[1000,400,110],[1180,320,110],[1360,240,110],[1520,170,110]], [[440,650],[800,500],[1180,320]], [[[260,680],[1000,360]],[[620,530],[1180,280]],[[800,460],[1520,130]]], [[350,600,200],[700,450,200],[1100,300,200]], [1560,90]],
  // L9: hard
  [[[80,780,90],[240,730,90],[400,670,90],[560,600,90],[720,530,90],[880,460,90],[1060,380,100],[1240,300,100],[1420,220,100],[1560,160,100]], [[240,730],[560,600],[880,460],[1240,300]], [[[400,630],[1060,340]],[[720,490],[1240,260]],[[880,420],[1560,120]]], [[320,620,200],[640,500,200],[980,360,200],[1350,200,200]], [1580,80]],
  // L10: hardest
  [[[80,780,90],[220,730,90],[380,660,90],[540,590,90],[700,520,90],[860,450,90],[1020,380,90],[1180,310,100],[1340,240,100],[1500,170,100]], [[220,730],[540,590],[860,450],[1180,310]], [[[380,620],[1020,340]],[[700,480],[1180,270]],[[860,410],[1500,130]]], [[300,620,200],[620,500,200],[940,380,200],[1280,250,200]], [1580,80]],
];

/* ═══════════════════════════════════════════════════════════════
   CASUAL MODE — Runner
   ═══════════════════════════════════════════════════════════════ */
const CasualMode = {
  dino: null, obstacles: [], tomatoes: [], speed: 7, baseSpeed: 7,
  spawnTimer: 0, tomTimer: 0, frame: 0, flying: false, flyTimer: 0, flyCD: 0,
  cameraX: 0, gameOver: false, won: false, bgOffset: 0,

  init() {
    this.dino = { x: 150, y: GROUND_Y - 226, w: 190, h: 226, vy: 0, jumping: false, squash: 0, facing: 'right' };
    this.obstacles = []; this.tomatoes = [];
    this.speed = this.baseSpeed = 7;
    this.spawnTimer = 60; this.tomTimer = 180; this.frame = 0;
    this.flying = false; this.flyTimer = 0; this.flyCD = 0;
    this.cameraX = 0; this.gameOver = false; this.won = false;
    score = 0; resetShields();
    scoreEl.hidden = false; levelIndicator.hidden = true;
    flightBtn.hidden = false;
    scoreCurrent.textContent = 0; scoreTarget.textContent = targetScore;
    joyMode = 'horizontal';
  },

  onJump() {
    if (this.gameOver) return;
    if (this.flying) return;
    if (!this.dino.jumping) {
      this.dino.vy = -14; this.dino.jumping = true; this.dino.squash = -0.4;
    }
  },

  activateFlight() {
    if (this.flyCD > 0 || this.flying || this.gameOver) return;
    this.flying = true; this.flyTimer = 300; this.flyCD = 480;
    this.dino.jumping = false; this.dino.vy = 0;
  },

  spawnObstacle() {
    const isBat = Math.random() < 0.4;
    if (isBat) {
      const y = 280 + Math.random() * 200;
      this.obstacles.push({ type: 'bat', x: W + 50, y: y, w: 60, h: 44, vx: -this.speed, frame: 0 });
    } else {
      const h = 50 + Math.random() * 30;
      this.obstacles.push({ type: 'hedgehog', x: W + 50, y: GROUND_Y - h, w: 60, h: h, vx: -this.speed, frame: 0 });
    }
  },

  spawnTomato() {
    const y = 300 + Math.random() * 250;
    this.tomatoes.push({ x: W + 30, y: y, size: 40, vx: -this.speed, collected: false, frame: 0 });
  },

  update() {
    if (this.gameOver) return;
    this.frame++;
    this.speed = this.baseSpeed + this.frame * 0.0015;
    this.bgOffset = (this.bgOffset + this.speed) % 1600;

    // Flight
    if (this.flying) {
      this.flyTimer--;
      if (moveY === -1 || keys['ArrowUp'] || keys['KeyW']) this.dino.y -= 5;
      if (moveY === 1 || keys['ArrowDown'] || keys['KeyS']) this.dino.y += 5;
      this.dino.y = Math.max(100, Math.min(GROUND_Y - this.dino.h, this.dino.y));
      if (this.flyTimer <= 0) { this.flying = false; this.dino.jumping = true; this.dino.vy = -5; }
    } else {
      // Gravity
      this.dino.vy += GRAVITY;
      this.dino.y += this.dino.vy;
      if (this.dino.y >= GROUND_Y - this.dino.h) {
        this.dino.y = GROUND_Y - this.dino.h; this.dino.vy = 0; this.dino.jumping = false;
      }
    }
    if (this.flyCD > 0) this.flyCD--;
    flightBtn.style.opacity = this.flyCD > 0 ? '0.4' : '1';

    // Horizontal movement
    if (moveX < 0) { this.dino.x -= 3; this.dino.facing = 'left'; }
    else if (moveX > 0) { this.dino.x += 3; this.dino.facing = 'right'; }
    this.dino.x = Math.max(50, Math.min(400, this.dino.x));

    // Squash recovery
    if (this.dino.squash < 0) this.dino.squash += 0.05;
    if (!this.dino.jumping && this.dino.squash > 0) this.dino.squash = 0;

    // Spawn
    this.spawnTimer--;
    if (this.spawnTimer <= 0) {
      this.spawnObstacle();
      this.spawnTimer = Math.max(40, 80 - this.frame * 0.01);
    }
    this.tomTimer--;
    if (this.tomTimer <= 0) { this.spawnTomato(); this.tomTimer = 200 + Math.random() * 200; }

    // Update obstacles
    const dinoBox = { x: this.dino.x + 40, y: this.dino.y + 30, w: this.dino.w - 80, h: this.dino.h - 50 };
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i];
      o.x += o.vx; o.vx = -this.speed; o.frame++;
      const oBox = { x: o.x + 8, y: o.y + 4, w: o.w - 16, h: o.h - 8 };
      if (!o.passed && o.x + o.w < this.dino.x) {
        o.passed = true;
        if (o.type === 'hedgehog') {
          score++; scoreCurrent.textContent = score;
          spawnPopup(o.x + o.w / 2, o.y - 10, t('score_pop'), '#07c160');
          if (score >= targetScore) { this.won = true; this.endGame('victory'); return; }
        }
      }
      if (!this.flying && aabb(dinoBox, oBox)) {
        if (useShield()) {
          spawnPopup(this.dino.x + this.dino.w / 2, this.dino.y, t('shield_pop'), '#ff6a00');
          this.obstacles.splice(i, 1);
        } else {
          this.endGame('defeat'); return;
        }
      }
      if (o.x + o.w < -100) this.obstacles.splice(i, 1);
    }

    // Update tomatoes
    for (let i = this.tomatoes.length - 1; i >= 0; i--) {
      const tm = this.tomatoes[i];
      tm.x += tm.vx; tm.vx = -this.speed; tm.frame++;
      const tmBox = { x: tm.x, y: tm.y, w: tm.size, h: tm.size };
      if (!tm.collected && (this.flying || aabb(dinoBox, tmBox))) {
        tm.collected = true; addShield();
        spawnPopup(tm.x + tm.size / 2, tm.y, shields > 1 ? t('shield_pop_multi', { n: shields }) : t('shield_pop'), '#ff6a00');
        this.tomatoes.splice(i, 1); continue;
      }
      if (tm.x + tm.size < -100) this.tomatoes.splice(i, 1);
    }
    updatePopups();
  },

  endGame(result) {
    this.gameOver = true;
    endGame(result);
  },

  render() {
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#87CEEB'); sky.addColorStop(0.6, '#B0E0F8'); sky.addColorStop(1, '#E8F4FD');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    drawClouds(this.bgOffset, 0.75);
    // Ground
    ctx.fillStyle = '#8BC34A'; ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);
    ctx.fillStyle = '#7CB342'; ctx.fillRect(0, GROUND_Y, W, 6);
    // Ground detail
    ctx.fillStyle = '#689F38';
    for (let i = 0; i < W; i += 40) {
      const gx = (i - this.bgOffset) % W;
      ctx.fillRect(gx, GROUND_Y + 15, 20, 3);
    }
    // Obstacles
    this.obstacles.forEach(o => {
      if (o.type === 'hedgehog') drawHedgehog(o.x, o.y, o.w, o.h, o.frame);
      else drawBat(o.x, o.y, o.w, o.h, o.frame);
    });
    // Tomatoes
    this.tomatoes.forEach(tm => drawTomato(tm.x, tm.y, tm.size, tm.frame));
    // Dino
    if (this.flying) {
      // airplane under dino
      ctx.save(); ctx.fillStyle = '#1989fa';
      ctx.beginPath();
      ctx.moveTo(this.dino.x + 20, this.dino.y + this.dino.h - 20);
      ctx.lineTo(this.dino.x + this.dino.w - 20, this.dino.y + this.dino.h - 40);
      ctx.lineTo(this.dino.x + this.dino.w - 60, this.dino.y + this.dino.h - 10);
      ctx.fill();
      ctx.restore();
    }
    drawDino(this.dino.x, this.dino.y, this.dino.w, this.dino.h, this.dino.facing, this.dino.squash);
    if (shields > 0) drawShieldAura(this.dino.x + 40, this.dino.y + 30, this.dino.w - 80, this.dino.h - 50, this.frame);
    drawPopups();
  },

  cleanup() { flightBtn.hidden = true; }
};

/* ═══════════════════════════════════════════════════════════════
   NOVICE MODE — Maze
   ═══════════════════════════════════════════════════════════════ */
const NoviceMode = {
  grid: null, dino: null, hedgehogs: [], bats: [], tomatoes: [],
  frame: 0, gameOver: false, won: false, goalGX: 0, goalGY: 0,

  init() {
    this.grid = generateMaze(levelIdx * 7 + 42);
    const ents = buildMazeEntities(this.grid, levelIdx * 7 + 42);
    this.hedgehogs = ents.hedgehogs.map(h => ({
      ...h, x: MAZE_OX + h.gx * CELL + 3, y: MAZE_OY + h.gy * CELL + 2,
      w: CELL - 6, h: CELL - 4, startGX: h.gx, progress: 0
    }));
    this.bats = ents.bats;
    this.tomatoes = ents.tomatoes.map(t => ({
      ...t, x: MAZE_OX + t.gx * CELL + 4, y: MAZE_OY + t.gy * CELL + 4,
      size: CELL - 8, frame: 0
    }));
    this.dino = { x: MAZE_OX + 3, y: MAZE_OY + CELL + 3, w: CELL - 8, h: CELL - 6, facing: 'right' };
    this.frame = 0; this.gameOver = false; this.won = false;
    this.goalGX = MAZE_COLS - 1; this.goalGY = MAZE_ROWS - 2;
    resetShields();
    scoreEl.hidden = true;
    levelIndicator.hidden = false;
    levelNameEl.textContent = t('level_n', { n: levelIdx + 1 });
    joyMode = 'full';
  },

  canMoveTo(nx, ny) {
    const d = this.dino;
    const corners = [
      [nx + 2, ny + 2], [nx + d.w - 2, ny + 2],
      [nx + 2, ny + d.h - 2], [nx + d.w - 2, ny + d.h - 2]
    ];
    for (const [px, py] of corners) {
      const gx = Math.floor((px - MAZE_OX) / CELL);
      const gy = Math.floor((py - MAZE_OY) / CELL);
      if (gx < 0 || gx >= MAZE_COLS || gy < 0 || gy >= MAZE_ROWS) return false;
      if (this.grid[gy][gx] === 1) return false;
    }
    return true;
  },

  onJump() { /* maze has no jump */ },

  update() {
    if (this.gameOver) return;
    this.frame++;
    const speed = 3.5;
    const d = this.dino;
    let dx = 0, dy = 0;
    if (moveX < 0 || keys['ArrowLeft'] || keys['KeyA']) { dx = -speed; d.facing = 'left'; }
    if (moveX > 0 || keys['ArrowRight'] || keys['KeyD']) { dx = speed; d.facing = 'right'; }
    if (moveY < 0 || keys['ArrowUp'] || keys['KeyW']) dy = -speed;
    if (moveY > 0 || keys['ArrowDown'] || keys['KeyS']) dy = speed;
    // Diagonal normalize
    if (dx !== 0 && dy !== 0) { dx *= 0.707; dy *= 0.707; }
    // Axis-separated collision
    if (dx !== 0 && this.canMoveTo(d.x + dx, d.y)) d.x += dx;
    if (dy !== 0 && this.canMoveTo(d.x, d.y + dy)) d.y += dy;

    // Update hedgehogs
    this.hedgehogs.forEach(h => {
      h.progress += 0.02 * h.dir;
      if (h.progress >= h.range - 1) { h.progress = h.range - 1; h.dir = -1; }
      if (h.progress <= 0) { h.progress = 0; h.dir = 1; }
      if (h.axis === 'h') { h.x = MAZE_OX + (h.startGX + h.progress) * CELL + 3; }
      else { h.y = MAZE_OY + (h.startGY + h.progress) * CELL + 2; }
    });

    // Update bats (diagonal, bounce off maze bounds)
    this.bats.forEach(b => {
      b.x += b.vx; b.y += b.vy;
      if (b.x < MAZE_OX || b.x + b.w > MAZE_OX + MAZE_W) b.vx *= -1;
      if (b.y < MAZE_OY || b.y + b.h > MAZE_OY + MAZE_H) b.vy *= -1;
    });

    // Tomato collection
    const dBox = { x: d.x, y: d.y, w: d.w, h: d.h };
    for (let i = this.tomatoes.length - 1; i >= 0; i--) {
      const tm = this.tomatoes[i];
      tm.frame++;
      if (aabb(dBox, { x: tm.x, y: tm.y, w: tm.size, h: tm.size })) {
        addShield();
        spawnPopup(tm.x + tm.size / 2, tm.y, shields > 1 ? t('shield_pop_multi', { n: shields }) : t('shield_pop'), '#ff6a00');
        this.tomatoes.splice(i, 1);
      }
    }

    // Hedgehog collision
    for (let i = this.hedgehogs.length - 1; i >= 0; i--) {
      const h = this.hedgehogs[i];
      if (aabb(dBox, h)) {
        if (useShield()) { spawnPopup(d.x + d.w / 2, d.y, t('shield_pop'), '#ff6a00'); this.hedgehogs.splice(i, 1); }
        else { this.endGame('defeat'); return; }
      }
    }
    // Bat collision
    for (let i = this.bats.length - 1; i >= 0; i--) {
      const b = this.bats[i];
      if (aabb(dBox, b)) {
        if (useShield()) { spawnPopup(d.x + d.w / 2, d.y, t('shield_pop'), '#ff6a00'); this.bats.splice(i, 1); }
        else { this.endGame('defeat'); return; }
      }
    }

    // Goal check
    const gx = Math.floor((d.x + d.w / 2 - MAZE_OX) / CELL);
    const gy = Math.floor((d.y + d.h / 2 - MAZE_OY) / CELL);
    if (gx === this.goalGX && gy === this.goalGY) { this.won = true; this.endGame('victory'); return; }
    updatePopups();
  },

  endGame(result) { this.gameOver = true; endGame(result); },

  render() {
    // Background
    ctx.fillStyle = '#F0F4F8'; ctx.fillRect(0, 0, W, H);
    drawClouds(this.frame * 0.5, 0.5);
    // Maze area background
    ctx.fillStyle = '#FAFBFC';
    ctx.fillRect(MAZE_OX - 4, MAZE_OY - 4, MAZE_W + 8, MAZE_H + 8);
    // Walls
    for (let y = 0; y < MAZE_ROWS; y++) {
      for (let x = 0; x < MAZE_COLS; x++) {
        if (this.grid[y][x] === 1) {
          const wx = MAZE_OX + x * CELL, wy = MAZE_OY + y * CELL;
          ctx.fillStyle = '#5B7FA6';
          ctx.beginPath();
          ctx.roundRect(wx + 1, wy + 1, CELL - 2, CELL - 2, 4);
          ctx.fill();
          ctx.fillStyle = '#7B9FC6';
          ctx.beginPath();
          ctx.roundRect(wx + 2, wy + 2, CELL - 4, CELL / 2 - 2, 3);
          ctx.fill();
        }
      }
    }
    // Goal (balloon at bottom-right)
    drawBalloon(MAZE_OX + this.goalGX * CELL + CELL / 2, MAZE_OY + this.goalGY * CELL - 10, this.frame);
    // Start marker
    ctx.fillStyle = 'rgba(7,193,96,0.3)';
    ctx.fillRect(MAZE_OX, MAZE_OY + CELL, CELL, CELL);
    // Tomatoes
    this.tomatoes.forEach(tm => drawTomato(tm.x, tm.y, tm.size, tm.frame));
    // Hedgehogs
    this.hedgehogs.forEach(h => drawHedgehog(h.x, h.y, h.w, h.h, this.frame));
    // Bats
    this.bats.forEach(b => drawBat(b.x, b.y, b.w, b.h, this.frame));
    // Dino
    drawDino(this.dino.x, this.dino.y, this.dino.w, this.dino.h, this.dino.facing, 0);
    if (shields > 0) drawShieldAura(this.dino.x, this.dino.y, this.dino.w, this.dino.h, this.frame);
    drawPopups();
  },

  cleanup() {}
};

/* ═══════════════════════════════════════════════════════════════
   HOOKED MODE — Platformer
   ═══════════════════════════════════════════════════════════════ */
const HookedMode = {
  level: null, ground: [], plats: [], pipes: [], hedgehogs: [], bats: [], tomatoes: [],
  dino: null, cameraX: 0, frame: 0, gameOver: false, won: false, levelW: 0, balloonX: 0,

  init() {
    const L = PLAT_LEVELS[levelIdx];
    this.levelW = L[0];
    this.ground = buildGround(L[1], this.levelW);
    this.plats = L[2].map(p => ({ x: p[0], y: p[1], w: p[2], h: 30 }));
    this.pipes = L[3].map(p => ({ x: p[0], y: GROUND_Y - p[1], w: 50, h: p[1] }));
    this.hedgehogs = L[4].map(h => ({ x: h[0], y: GROUND_Y - 36, w: 40, h: 36, range: h[1], startX: h[0], dir: 1, frame: 0 }));
    this.bats = L[5].map(b => ({ x: b[0], y: b[1], w: 50, h: 36, range: b[2], startX: b[0], dir: 1, frame: 0 }));
    this.tomatoes = L[6].map(t => ({ x: t[0], y: t[1], size: 36, collected: false, frame: 0 }));
    this.balloonX = L[7];
    this.dino = { x: 100, y: GROUND_Y - 60, w: 50, h: 60, vx: 0, vy: 0, onGround: false, facing: 'right', squash: 0 };
    this.cameraX = 0; this.frame = 0; this.gameOver = false; this.won = false;
    resetShields();
    scoreEl.hidden = true;
    levelIndicator.hidden = false;
    levelNameEl.textContent = t('level_n', { n: levelIdx + 1 });
    joyMode = 'horizontal';
  },

  onJump() {
    if (this.gameOver) return;
    if (this.dino.onGround) {
      this.dino.vy = -13; this.dino.onGround = false; this.dino.squash = -0.4;
    }
  },

  update() {
    if (this.gameOver) return;
    this.frame++;
    const d = this.dino;
    // Horizontal
    const speed = 5;
    if (moveX < 0 || keys['ArrowLeft'] || keys['KeyA']) { d.vx = -speed; d.facing = 'left'; }
    else if (moveX > 0 || keys['ArrowRight'] || keys['KeyD']) { d.vx = speed; d.facing = 'right'; }
    else d.vx = 0;
    // Gravity
    d.vy += GRAVITY;
    // Move X
    d.x += d.vx;
    d.x = Math.max(0, Math.min(this.levelW - d.w, d.x));
    // Pipe collision X
    this.pipes.forEach(p => {
      if (aabb(d, p)) {
        if (d.vx > 0) d.x = p.x - d.w;
        else if (d.vx < 0) d.x = p.x + p.w;
      }
    });
    // Move Y
    d.y += d.vy;
    d.onGround = false;
    // Ground collision
    for (const [gx, gw] of this.ground) {
      if (d.x + d.w > gx && d.x < gx + gw && d.y + d.h >= GROUND_Y && d.y + d.h <= GROUND_Y + 20) {
        d.y = GROUND_Y - d.h; d.vy = 0; d.onGround = true;
      }
    }
    // Platform collision (one-way: land from above)
    this.plats.forEach(p => {
      if (d.vy >= 0 && d.x + d.w > p.x && d.x < p.x + p.w &&
        d.y + d.h >= p.y && d.y + d.h <= p.y + 16 && d.y + d.h - d.vy < p.y + 4) {
        d.y = p.y - d.h; d.vy = 0; d.onGround = true;
      }
    });
    // Pipe collision Y (land on top)
    this.pipes.forEach(p => {
      if (d.vy >= 0 && d.x + d.w > p.x + 4 && d.x < p.x + p.w - 4 &&
        d.y + d.h >= p.y && d.y + d.h <= p.y + 16) {
        d.y = p.y - d.h; d.vy = 0; d.onGround = true;
      }
    });
    // Squash
    if (d.squash < 0) d.squash += 0.05;
    // Camera
    this.cameraX = Math.max(0, Math.min(this.levelW - W, d.x - W / 3));

    // Update hedgehogs
    this.hedgehogs.forEach(h => {
      h.x += h.dir * 1.5; h.frame++;
      if (h.x > h.startX + h.range) h.dir = -1;
      if (h.x < h.startX - h.range) h.dir = 1;
    });
    // Update bats
    this.bats.forEach(b => {
      b.x += b.dir * 2; b.frame++;
      if (b.x > b.startX + b.range) b.dir = -1;
      if (b.x < b.startX - b.range) b.dir = 1;
    });

    const dBox = { x: d.x + 6, y: d.y + 4, w: d.w - 12, h: d.h - 8 };
    // Tomato collection
    for (let i = this.tomatoes.length - 1; i >= 0; i--) {
      const tm = this.tomatoes[i];
      tm.frame++;
      if (aabb(dBox, { x: tm.x, y: tm.y, w: tm.size, h: tm.size })) {
        addShield();
        spawnPopup(tm.x + tm.size / 2 - this.cameraX, tm.y, shields > 1 ? t('shield_pop_multi', { n: shields }) : t('shield_pop'), '#ff6a00');
        this.tomatoes.splice(i, 1);
      }
    }
    // Hedgehog collision
    for (let i = this.hedgehogs.length - 1; i >= 0; i--) {
      const h = this.hedgehogs[i];
      if (aabb(dBox, { x: h.x + 4, y: h.y + 4, w: h.w - 8, h: h.h - 8 })) {
        if (useShield()) { spawnPopup(d.x + d.w / 2 - this.cameraX, d.y, t('shield_pop'), '#ff6a00'); this.hedgehogs.splice(i, 1); }
        else { this.endGame('defeat'); return; }
      }
    }
    // Bat collision
    for (let i = this.bats.length - 1; i >= 0; i--) {
      const b = this.bats[i];
      if (aabb(dBox, { x: b.x + 4, y: b.y + 4, w: b.w - 8, h: b.h - 8 })) {
        if (useShield()) { spawnPopup(d.x + d.w / 2 - this.cameraX, d.y, t('shield_pop'), '#ff6a00'); this.bats.splice(i, 1); }
        else { this.endGame('defeat'); return; }
      }
    }
    // Fell in pit
    if (d.y > H + 100) { this.endGame('defeat'); return; }
    // Reached balloon
    if (d.x + d.w >= this.balloonX && d.x <= this.balloonX + 60) {
      this.won = true; this.endGame('victory'); return;
    }
    updatePopups();
  },

  endGame(result) { this.gameOver = true; endGame(result); },

  render() {
    const cam = this.cameraX;
    // Sky
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#87CEEB'); sky.addColorStop(0.7, '#C8E6F8'); sky.addColorStop(1, '#E8F4FD');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    drawClouds(cam, 0.6);
    // Ground segments
    ctx.fillStyle = '#8BC34A';
    this.ground.forEach(([gx, gw]) => {
      ctx.fillRect(gx - cam, GROUND_Y, gw, H - GROUND_Y);
    });
    ctx.fillStyle = '#7CB342';
    this.ground.forEach(([gx, gw]) => ctx.fillRect(gx - cam, GROUND_Y, gw, 6));
    // Platforms
    this.plats.forEach(p => drawPlatform(p.x - cam, p.y, p.w, p.h));
    // Pipes
    this.pipes.forEach(p => drawPipe(p.x - cam, p.y, p.w, p.h));
    // Balloon
    drawBalloon(this.balloonX - cam + 20, GROUND_Y - 100, this.frame);
    // Tomatoes
    this.tomatoes.forEach(tm => drawTomato(tm.x - cam, tm.y, tm.size, tm.frame));
    // Hedgehogs
    this.hedgehogs.forEach(h => drawHedgehog(h.x - cam, h.y, h.w, h.h, h.frame));
    // Bats
    this.bats.forEach(b => drawBat(b.x - cam, b.y, b.w, b.h, b.frame));
    // Dino
    drawDino(this.dino.x - cam, this.dino.y, this.dino.w, this.dino.h, this.dino.facing, this.dino.squash);
    if (shields > 0) drawShieldAura(this.dino.x - cam + 6, this.dino.y + 4, this.dino.w - 12, this.dino.h - 8, this.frame);
    drawPopups();
  },

  cleanup() {}
};

/* ═══════════════════════════════════════════════════════════════
   EXPERT MODE — Portal Islands
   ═══════════════════════════════════════════════════════════════ */
const ExpertMode = {
  islands: [], trampolines: [], portals: [], bats: [], tomatoes: [],
  dino: null, frame: 0, gameOver: false, won: false, balloon: null,
  portalCooldown: 0,

  init() {
    const L = PORTAL_LEVELS[levelIdx];
    this.islands = [{ x: 60, y: 780, w: 110, h: 24 }].concat(L[0].map(i => ({ x: i[0], y: i[1], w: i[2], h: 24 })));
    this.trampolines = L[1].map(t => ({ x: t[0], y: t[1], w: 50, bounce: 0 }));
    this.portals = L[2].map(p => ({ x1: p[0][0], y1: p[0][1], x2: p[1][0], y2: p[1][1], r: 28, frame: 0 }));
    this.bats = L[3].map(b => ({ x: b[0], y: b[1], w: 46, h: 32, range: b[2], startX: b[0], dir: 1, frame: 0 }));
    this.tomatoes = [];
    for (let i = 2; i < this.islands.length - 1; i += 2) {
      if (i <= 4 || Math.random() < 0.5) this.tomatoes.push({ x: this.islands[i].x + this.islands[i].w / 2 - 14, y: this.islands[i].y - 40, size: 30, collected: false, frame: 0 });
    }
    this.balloon = { x: L[4][0], y: L[4][1] };
    this.dino = { x: 90, y: 780 - 52, w: 44, h: 52, vx: 0, vy: 0, onGround: false, facing: 'right', squash: 0 };
    this.frame = 0; this.gameOver = false; this.won = false; this.portalCooldown = 0;
    resetShields();
    scoreEl.hidden = true;
    levelIndicator.hidden = false;
    levelNameEl.textContent = t('level_n', { n: levelIdx + 1 });
    joyMode = 'horizontal';
  },

  onJump() {
    if (this.gameOver) return;
    if (this.dino.onGround) {
      this.dino.vy = -12; this.dino.onGround = false; this.dino.squash = -0.4;
    }
  },

  update() {
    if (this.gameOver) return;
    this.frame++;
    const d = this.dino;
    const speed = 4.5;
    if (moveX < 0 || keys['ArrowLeft'] || keys['KeyA']) { d.vx = -speed; d.facing = 'left'; }
    else if (moveX > 0 || keys['ArrowRight'] || keys['KeyD']) { d.vx = speed; d.facing = 'right'; }
    else d.vx *= 0.8;
    d.vy += 0.5;
    d.x += d.vx; d.y += d.vy;
    d.onGround = false;
    if (d.squash < 0) d.squash += 0.05;
    if (this.portalCooldown > 0) this.portalCooldown--;

    // Island collision
    this.islands.forEach(isl => {
      if (d.vy >= 0 && d.x + d.w > isl.x + 4 && d.x < isl.x + isl.w - 4 &&
        d.y + d.h >= isl.y && d.y + d.h <= isl.y + 16) {
        d.y = isl.y - d.h; d.vy = 0; d.onGround = true;
        // Trampoline check
        this.trampolines.forEach(tr => {
          if (Math.abs((d.x + d.w / 2) - (tr.x + tr.w / 2)) < 30 && Math.abs(isl.y - tr.y) < 5) {
            d.vy = -19; d.onGround = false; tr.bounce = 10;
          }
        });
      }
    });
    this.trampolines.forEach(tr => { if (tr.bounce > 0) tr.bounce--; });

    // Portal teleport
    if (this.portalCooldown === 0) {
      for (const p of this.portals) {
        p.frame++;
        const in1 = aabb(d, { x: p.x1 - p.r, y: p.y1 - p.r, w: p.r * 2, h: p.r * 2 });
        const in2 = aabb(d, { x: p.x2 - p.r, y: p.y2 - p.r, w: p.r * 2, h: p.r * 2 });
        if (in1) { d.x = p.x2 - d.w / 2; d.y = p.y2 - d.h / 2; this.portalCooldown = 30; break; }
        if (in2) { d.x = p.x1 - d.w / 2; d.y = p.y1 - d.h / 2; this.portalCooldown = 30; break; }
      }
    }
    // Bats
    this.bats.forEach(b => {
      b.x += b.dir * 2.2; b.frame++;
      if (b.x > b.startX + b.range) b.dir = -1;
      if (b.x < b.startX - b.range) b.dir = 1;
    });
    const dBox = { x: d.x + 5, y: d.y + 4, w: d.w - 10, h: d.h - 8 };
    // Tomatoes
    for (let i = this.tomatoes.length - 1; i >= 0; i--) {
      const tm = this.tomatoes[i]; tm.frame++;
      if (aabb(dBox, { x: tm.x, y: tm.y, w: tm.size, h: tm.size })) {
        addShield();
        spawnPopup(tm.x + tm.size / 2, tm.y, shields > 1 ? t('shield_pop_multi', { n: shields }) : t('shield_pop'), '#ff6a00');
        this.tomatoes.splice(i, 1);
      }
    }
    // Bat collision
    for (let i = this.bats.length - 1; i >= 0; i--) {
      const b = this.bats[i];
      if (aabb(dBox, { x: b.x + 4, y: b.y + 4, w: b.w - 8, h: b.h - 8 })) {
        if (useShield()) { spawnPopup(d.x + d.w / 2, d.y, t('shield_pop'), '#ff6a00'); this.bats.splice(i, 1); }
        else { this.endGame('defeat'); return; }
      }
    }
    // Fell off
    if (d.y > H + 100 || d.x < -100 || d.x > W + 100) { this.endGame('defeat'); return; }
    // Reached balloon
    if (aabb(dBox, { x: this.balloon.x - 20, y: this.balloon.y - 20, w: 60, h: 80 })) {
      this.won = true; this.endGame('victory'); return;
    }
    updatePopups();
  },

  endGame(result) { this.gameOver = true; endGame(result); },

  render() {
    // Sky (darker, more magical)
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#1a1a3e'); sky.addColorStop(0.5, '#3d2b5e'); sky.addColorStop(1, '#5a3d7a');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // Stars
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 40; i++) {
      const sx = (i * 137 + 50) % W, sy = (i * 89 + 30) % (H * 0.6);
      const tw = 0.5 + 0.5 * Math.sin(this.frame * 0.05 + i);
      ctx.globalAlpha = tw * 0.8;
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Night clouds
    drawClouds(this.frame * 0.3, 0.1);
    // Start pipe
    drawStartPipe(80, GROUND_Y);
    // Islands
    this.islands.forEach(isl => drawIsland(isl.x, isl.y, isl.w, isl.h));
    // Trampolines
    this.trampolines.forEach(tr => drawTrampoline(tr.x, tr.y - (tr.bounce > 0 ? tr.bounce : 0), tr.w));
    // Portals
    this.portals.forEach(p => {
      drawPortal(p.x1, p.y1, p.r, p.frame);
      drawPortal(p.x2, p.y2, p.r, p.frame);
    });
    // Balloon
    drawBalloon(this.balloon.x, this.balloon.y, this.frame);
    // Tomatoes
    this.tomatoes.forEach(tm => drawTomato(tm.x, tm.y, tm.size, tm.frame));
    // Bats
    this.bats.forEach(b => drawBat(b.x, b.y, b.w, b.h, b.frame));
    // Dino
    drawDino(this.dino.x, this.dino.y, this.dino.w, this.dino.h, this.dino.facing, this.dino.squash);
    if (shields > 0) drawShieldAura(this.dino.x + 5, this.dino.y + 4, this.dino.w - 10, this.dino.h - 8, this.frame);
    drawPopups();
  },

  cleanup() {}
};

/* ═══════════════════════════════════════════════════════════════
   GAME FLOW
   ═══════════════════════════════════════════════════════════════ */
function showOverlay(el) { el.hidden = false; }
function hideOverlay(el) { el.hidden = true; }

function showStartScreen() {
  gameState = 'start';
  stopBGM();
  hideOverlay(casualPopup); hideOverlay(levelPopup); hideOverlay(pausePopup); hideOverlay(gameOverScreen);
  showOverlay(startScreen);
  scoreEl.hidden = true; levelIndicator.hidden = true; topCtrls.style.display = 'none';
  mobileCtrls.style.display = 'none'; flightBtn.hidden = true;
  cctx.clearRect(0, 0, W, H); confettiParts = [];
  destroyJoy();
}

function showCasualPopup() {
  hideOverlay(startScreen); showOverlay(casualPopup);
}

function showLevelPopup(modeKey) {
  mode = modeKey;
  let title, desc, count;
  if (modeKey === 'novice') { title = t('mode_novice') + ' · ' + t('select_level'); desc = t('maze_desc'); count = 10; }
  else if (modeKey === 'hooked') { title = t('mode_hooked') + ' · ' + t('select_level'); desc = t('platformer_desc'); count = 10; }
  else { title = t('mode_expert') + ' · ' + t('select_level'); desc = t('portal_desc'); count = 10; }
  $('level-popup-title').textContent = title;
  $('level-popup-desc').textContent = desc;
  const grid = $('level-grid');
  grid.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const btn = document.createElement('button');
    btn.className = 'level-btn';
    btn.textContent = i + 1;
    btn.addEventListener('click', () => startGame(modeKey, i));
    grid.appendChild(btn);
  }
  hideOverlay(startScreen); showOverlay(levelPopup);
}

function startGame(modeKey, lvl) {
  mode = modeKey; levelIdx = lvl || 0;
  hideOverlay(startScreen); hideOverlay(casualPopup); hideOverlay(levelPopup);
  hideOverlay(pausePopup); hideOverlay(gameOverScreen);
  topCtrls.style.display = 'flex'; mobileCtrls.style.display = 'block';
  flightBtn.hidden = modeKey !== 'casual';
  if (modeKey === 'casual') {
    targetScore = parseInt(targetInput.value, 10) || 10;
    handler = CasualMode;
  } else if (modeKey === 'novice') handler = NoviceMode;
  else if (modeKey === 'hooked') handler = HookedMode;
  else handler = ExpertMode;
  handler.init();
  gameState = 'playing';
  playBGM();
}

function pauseGame() {
  if (gameState !== 'playing') return;
  gameState = 'paused'; stopBGM(); showOverlay(pausePopup);
}
function resumeGame() {
  if (gameState !== 'paused') return;
  gameState = 'playing'; hideOverlay(pausePopup); playBGM();
}
function quitToMenu() {
  gameState = 'start';
  if (handler && handler.cleanup) handler.cleanup();
  handler = null;
  hideOverlay(pausePopup); hideOverlay(gameOverScreen);
  showStartScreen();
}

function endGame(result) {
  gameState = 'over';
  stopBGM();
  destroyJoy();
  if (handler && handler.cleanup) handler.cleanup();

  finalScoreEl.textContent = score;
  finalTargetEl.textContent = targetScore;

  if (result === 'victory') {
    resultIcon.textContent = '🏆';
    resultTitle.textContent = t('victory');
    resultTitle.className = 'result-title victory';
    gameOverScreen.querySelector('.wx-card--result').classList.add('wx-card--victory');
    gameOverScreen.querySelector('.wx-card--result').classList.remove('wx-card--defeat');
    if (mode === 'casual') resultMsg.textContent = t('victory_msg', { target: targetScore, diff: t('mode_casual') });
    else if (mode === 'novice') resultMsg.textContent = t('victory_maze');
    else if (mode === 'hooked') resultMsg.textContent = t('victory_plat');
    else resultMsg.textContent = t('victory_portal');
    finalScoreEl.classList.add('highlight');
    scoreBox.style.display = mode === 'casual' ? '' : 'none';
    spawnConfetti();
  } else {
    resultIcon.textContent = '💥';
    resultTitle.textContent = t('game_over');
    resultTitle.className = 'result-title defeat';
    gameOverScreen.querySelector('.wx-card--result').classList.add('wx-card--defeat');
    gameOverScreen.querySelector('.wx-card--result').classList.remove('wx-card--victory');
    if (mode === 'casual') {
      const remaining = targetScore - score;
      resultMsg.textContent = remaining > 0 ? t('defeat_msg_near', { diff: remaining }) : t('defeat_msg');
      scoreBox.style.display = '';
    } else {
      resultMsg.textContent = t('defeat_msg');
      scoreBox.style.display = 'none';
    }
    finalScoreEl.classList.remove('highlight');
  }
  showOverlay(gameOverScreen);
  scoreEl.hidden = true; levelIndicator.hidden = true;
  topCtrls.style.display = 'none'; mobileCtrls.style.display = 'none'; flightBtn.hidden = true;
}

function restartGame() {
  startGame(mode, levelIdx);
}

/* ═══════════════════════════════════════════════════════════════
   MAIN LOOP
   ═══════════════════════════════════════════════════════════════ */
function loop(ts) {
  if (gameState === 'playing' && handler) {
    handler.update();
    ctx.clearRect(0, 0, W, H);
    handler.render();
  }
  if (confettiParts.length > 0) { updateConfetti(); drawConfetti(); }
  else cctx.clearRect(0, 0, W, H);
  animFrame = requestAnimationFrame(loop);
}

/* ═══════════════════════════════════════════════════════════════
   UI EVENTS
   ═══════════════════════════════════════════════════════════════ */
// Mode buttons
document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const m = btn.dataset.mode;
    if (m === 'casual') showCasualPopup();
    else showLevelPopup(m);
  });
});

// Back buttons
document.querySelectorAll('.modal-back').forEach(btn => {
  btn.addEventListener('click', () => {
    hideOverlay(casualPopup); hideOverlay(levelPopup);
    showOverlay(startScreen);
  });
});

// Start casual
$('start-casual').addEventListener('click', () => startGame('casual', 0));

// Score stepper
$('score-minus').addEventListener('click', () => {
  let v = parseInt(targetInput.value, 10) || 10;
  targetInput.value = Math.max(1, v - 1);
});
$('score-plus').addEventListener('click', () => {
  let v = parseInt(targetInput.value, 10) || 10;
  targetInput.value = Math.min(999, v + 1);
});
targetInput.addEventListener('change', () => {
  let v = parseInt(targetInput.value, 10);
  if (isNaN(v) || v < 1) targetInput.value = 10;
  else if (v > 999) targetInput.value = 999;
});

// Top controls
soundBtn.addEventListener('click', toggleBGM);
flightBtn.addEventListener('click', () => { if (handler === CasualMode) CasualMode.activateFlight(); });
pauseBtn.addEventListener('click', () => { if (gameState === 'playing') pauseGame(); });

// Pause popup
$('btn-resume').addEventListener('click', resumeGame);
$('btn-quit').addEventListener('click', quitToMenu);

// Game over
$('restart').addEventListener('click', restartGame);
$('btn-home').addEventListener('click', quitToMenu);

// Language
document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
});

/* ═══════════════════════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════════════════════ */
function init() {
  resize();
  initBGM();
  updateSoundIcon();

  // Load preferences
  try {
    const sl = localStorage.getItem('dino_lang');
    if (sl && I18N[sl]) applyLanguage(sl); else applyLanguage('zh');
    const sb = localStorage.getItem('dino_bgm');
    if (sb !== null) bgmEnabled = sb === '1';
    updateSoundIcon();
  } catch (e) { applyLanguage('zh'); }

  // Load dino image
  let loadDone = false;
  function finishLoad() {
    if (loadDone) return;
    loadDone = true;
    progressEl.style.transform = 'scaleX(1)';
    loadingText.textContent = t('loading') + ' 100%';
    setTimeout(() => {
      loadingEl.classList.add('hidden');
      setTimeout(() => { loadingEl.style.display = 'none'; }, 350);
      gameState = 'start';
      showOverlay(startScreen);
      animFrame = requestAnimationFrame(loop);
    }, 300);
  }
  dinoImg.onload = finishLoad;
  dinoImg.onerror = finishLoad;
  dinoImg.src = DINO_URL;
  setTimeout(finishLoad, 3000);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

})();
