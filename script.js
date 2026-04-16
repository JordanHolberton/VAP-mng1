// Particle Flow Puzzle - lightweight implementation
// Particle Flow Puzzle - lightweight implementation
const canvasEl = document.getElementById('liquidCanvas');
const ctx = canvasEl.getContext('2d');
const startBtn = document.getElementById('startBtn');
const resetBtn = document.getElementById('resetBtn');
const revealEl = document.getElementById('reveal');
const overlay = document.getElementById('overlay');

let W = 0, H = 0, DPR = Math.max(1, window.devicePixelRatio || 1);

function resize() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    canvasEl.width = Math.floor(W * DPR);
    canvasEl.height = Math.floor(H * DPR);
    canvasEl.style.width = W + 'px';
    canvasEl.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

// Particles
const PCOUNT = 700; const PR = 6;
let particles = [];
function createParticles() { particles = []; for (let i = 0; i < PCOUNT; i++) particles.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.6, r: PR }); }

// Obstacles
let drawing = false, currentLine = [], obstacles = [];
function startDraw(x, y) { drawing = true; currentLine = [{ x, y }]; }
function addPoint(x, y) { if (drawing) currentLine.push({ x, y }); }
function endDraw() { if (drawing) { drawing = false; if (currentLine.length > 1) obstacles.push(currentLine); currentLine = []; } }

// Physics
function step(dt) { const gx = 0, gy = 0.36; for (let p of particles) { p.vx += gx * dt; p.vy += gy * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.x < -10) p.x = W + 10; if (p.x > W + 10) p.x = -10; if (p.y > H + 20) { p.y = -20; p.vy *= 0.4; } for (let poly of obstacles) { for (let i = 0; i < poly.length - 1; i++) { const a = poly[i], b = poly[i + 1]; const vx = b.x - a.x, vy = b.y - a.y; const wx = p.x - a.x, wy = p.y - a.y; const len2 = vx * vx + vy * vy; if (len2 === 0) continue; let t = (wx * vx + wy * vy) / len2; t = Math.max(0, Math.min(1, t)); const cx = a.x + vx * t, cy = a.y + vy * t; const dx = p.x - cx, dy = p.y - cy; const dist2 = dx * dx + dy * dy; const minD = p.r + 2; if (dist2 < minD * minD) { const dist = Math.sqrt(dist2) || 0.001; const nx = dx / dist, ny = dy / dist; p.x = cx + nx * minD; p.y = cy + ny * minD; const dot = p.vx * nx + p.vy * ny; p.vx -= 1.6 * dot * nx; p.vy -= 1.6 * dot * ny; p.vx *= 0.92; p.vy *= 0.92; } } } } }

// Draw
function draw() { ctx.clearRect(0, 0, W, H); for (let p of particles) { ctx.beginPath(); ctx.fillStyle = '#000'; ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill(); const speed = Math.min(1.6, Math.hypot(p.vx, p.vy)); const hx = p.x - p.vx * 2.6, hy = p.y - p.vy * 2.6; const g = ctx.createRadialGradient(hx, hy, p.r * 0.05, hx, hy, p.r * 0.9); g.addColorStop(0, 'rgba(255,255,255,' + (0.32 + speed * 0.28) + ')'); g.addColorStop(0.6, 'rgba(255,255,255,0.08)'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 1.05, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; } ctx.strokeStyle = 'rgba(200,200,200,0.95)'; ctx.lineWidth = 6; ctx.lineCap = 'round'; for (let poly of obstacles) { ctx.beginPath(); ctx.moveTo(poly[0].x, poly[0].y); for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y); ctx.stroke(); } if (currentLine.length > 0) { ctx.beginPath(); ctx.moveTo(currentLine[0].x, currentLine[0].y); for (let i = 1; i < currentLine.length; i++) ctx.lineTo(currentLine[i].x, currentLine[i].y); ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 4; ctx.stroke(); } }

// Reveal
function calcReveal() { const box = { x: W * 0.15, y: H * 0.25, w: W * 0.7, h: H * 0.5 }; const SAMPLE = 400; let visible = 0; for (let i = 0; i < SAMPLE; i++) { const sx = box.x + Math.random() * box.w, sy = box.y + Math.random() * box.h; let covered = false; for (let p of particles) { const dx = p.x - sx, dy = p.y - sy; if (dx * dx + dy * dy <= (p.r * 1.1) * (p.r * 1.1)) { covered = true; break; } } if (!covered) visible++; } const percent = Math.round((visible / SAMPLE) * 100); revealEl.textContent = 'Révélé: ' + percent + '%'; return percent; }

// Input
function toLocal(e) { const rect = canvasEl.getBoundingClientRect(); if (e.touches && e.touches.length) return Array.from(e.touches).map(t => ({ x: t.clientX - rect.left, y: t.clientY - rect.top })); return [{ x: e.clientX - rect.left, y: e.clientY - rect.top }]; }
canvasEl.addEventListener('touchstart', (e) => { e.preventDefault(); const pts = toLocal(e); startDraw(pts[0].x, pts[0].y); }, { passive: false });
canvasEl.addEventListener('touchmove', (e) => { e.preventDefault(); const pts = toLocal(e); addPoint(pts[0].x, pts[0].y); }, { passive: false });
canvasEl.addEventListener('touchend', (e) => { e.preventDefault(); endDraw(); }, { passive: false });
canvasEl.addEventListener('pointerdown', (e) => { e.preventDefault(); startDraw(e.clientX, e.clientY); function mv(ev) { addPoint(ev.clientX, ev.clientY); } function up() { endDraw(); window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); } window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up); }, { passive: false });

resetBtn.addEventListener('click', () => { obstacles = []; createParticles(); });

let last = performance.now();
function loop(now) { const dt = Math.min(40, now - last) / 16.666; last = now; step(dt); draw(); const pct = calcReveal(); if (pct >= 85) revealEl.textContent = 'Révélé: 100% — Bravo!'; requestAnimationFrame(loop); }

function startGame() { resize(); createParticles(); window.addEventListener('resize', resize); if (overlay) overlay.style.display = 'none'; requestAnimationFrame(loop); }

startBtn.addEventListener('click', () => { startGame(); });
