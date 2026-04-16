// Nouveau script.js : bulles multi-couleurs / tailles + cible unique avec feedback

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const resetBtn = document.getElementById('resetBtn');
const toast = document.getElementById('toast');

let DPR = Math.max(1, window.devicePixelRatio || 1);
let W = 0, H = 0;

function resize() {
    DPR = Math.max(1, window.devicePixelRatio || 1);
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);
    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', () => setTimeout(resize, 40));
resize();

// Game state
let bubbles = [];
let score = 0;
let lastSpawn = 0;
let gameOver = false;

const SPAWN_INTERVAL = 550; // ms (slower spawn)
const MAX_BUBBLES = 60; // reduced density

// Colors with names (used for feedback)
const COLORS = [
    { name: 'bleu', hex: '#00d4ff' },
    { name: 'jaune', hex: '#FFD36C' },
    { name: 'rouge', hex: '#FF9E9E' },
    { name: 'vert', hex: '#98F7B8' },
    { name: 'violet', hex: '#E69CE6' },
    { name: 'cyan', hex: '#6CE7FF' },
    { name: 'orange', hex: '#FFB86B' },
    { name: 'rose', hex: '#FF7FBF' }
];

// Size levels 1..5 -> radius ranges (more separated for clearer differences)
const SIZE_MAP = {
    1: [10, 14],
    2: [16, 22],
    3: [24, 30],
    4: [32, 40],
    5: [44, 60]
};

// Target for this session
let targetColorName = null;
let targetSizeLevel = null;
let targetCode = 'CODE-1234';

// Utility
function rand(min, max) { return min + Math.random() * (max - min); }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickColor() { return pick(COLORS); }
function getSizeForLevel(level) {
    const [a, b] = SIZE_MAP[level];
    return Math.round(rand(a, b));
}

// Bubble factory (random color & size level)
function spawnBubble(x) {
    if (gameOver) return;
    if (bubbles.length >= MAX_BUBBLES) return;
    // choose color and size, but avoid creating an exact duplicate of the target
    let colorObj, sizeLevel, r;
    colorObj = pickColor();
    sizeLevel = Math.floor(rand(1, 6)); // 1..5
    r = getSizeForLevel(sizeLevel);
    // If a target is defined, ensure non-target bubbles do NOT match both color+size exactly
    if (targetColorName && targetSizeLevel) {
        if (colorObj.name === targetColorName && sizeLevel === targetSizeLevel) {
            // change either color or size to ensure uniqueness
            // prefer changing size level by +/-1 when possible
            if (sizeLevel < 5) {
                sizeLevel = sizeLevel + 1;
            } else {
                sizeLevel = sizeLevel - 1;
            }
            r = getSizeForLevel(sizeLevel);
            // if color still matches target (it will), keep color but size changed so it's no longer identical
        }
    }
    const bx = x != null ? Math.max(r, Math.min(W - r, x)) : rand(r, W - r);
    // spawn a bit below the bottom but not too far, so bubbles rise into view quickly
    const by = Math.min(H - r * 0.5, H + r + rand(6, 28));
    const vx = rand(-0.12, 0.12);
    const vy = rand(-1.2, -0.5);
    bubbles.push({
        x: bx, y: by, vx, vy, r,
        colorName: colorObj.name,
        color: colorObj.hex,
        sizeLevel,
        alpha: 1, popped: false, popT: 0,
        sparkle: Math.random() * 0.9 + 0.5,
        treasure: false // only createTargetBubble will set true for the unique correct bubble
    });
}

// Pop handling and feedback
function popBubble(b, pointerX, pointerY) {
    if (b.popped) return;
    b.popped = true;
    b.popT = 0;

    // doux pop
    b.vx *= 0.25;
    b.vy *= 0.25;
    b.vx += rand(-0.6, 0.6);
    b.vy -= rand(0.2, 0.8);

    score += Math.ceil(b.r / 6);
    updateScore();

    // Feedback logic before finalizing
    if (b.treasure) {
        // correct bubble -> end game, reveal code
        showToast('Bravo ! Code : ' + b.code, { duration: 0 });
        gameOver = true;
        interactionsEnabled = false;
        // disable input handlers by setting flag; handlers check interactionsEnabled
        // call optional global callback
        if (typeof window.onTreasureFound === 'function') {
            try { window.onTreasureFound(b.code); } catch (err) { console.error(err); }
        }
        // mark all other bubbles as non-interactive (they still animate then can be cleared)
        // Stop spawning further bubbles is handled by gameOver flag.
        return;
    }

    // If not treasure, give hint
    if (b.colorName !== targetColorName) {
        showToast('Mauvaise couleur');
    } else {
        // same color but wrong size
        if (b.sizeLevel < targetSizeLevel) {
            showToast('Plus gros');
        } else if (b.sizeLevel > targetSizeLevel) {
            showToast('Plus petit');
        } else {
            // rare case: a bubble matches both color and size but wasn't the treasure because we ensured unique target;
            // still treat as "presque" and give small feedback
            showToast('Presque !');
        }
    }
}

// Score UI
function updateScore() { scoreEl.textContent = 'Score: ' + score; }

// Small toast
let toastTimer = null;
let interactionsEnabled = true;
function showToast(txt, options = {}) {
    // options.duration in ms; if duration === 0 or Infinity -> persistent (do not auto-hide)
    const duration = (typeof options.duration === 'number') ? options.duration : 900;
    toast.textContent = txt;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    toast.setAttribute('aria-hidden', 'false');
    clearTimeout(toastTimer);
    if (duration > 0 && isFinite(duration)) {
        toastTimer = setTimeout(() => { toast.style.opacity = '0'; toast.setAttribute('aria-hidden', 'true'); }, duration);
    } else {
        // persistent: do not auto-hide
        toastTimer = null;
    }
}

// Physics & drawing
function update(dt) {
    if (!gameOver) {
        // spawn bubbles regularly from bottom
        lastSpawn += dt * 16.666;
        if (lastSpawn >= SPAWN_INTERVAL) {
            lastSpawn = 0;
            spawnBubble();
            if (Math.random() < 0.2) spawnBubble(Math.random() < 0.5 ? rand(20, 60) : rand(W - 60, W - 20));
        }
    }

    for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (b.popped) {
            b.popT += dt;
            b.alpha = Math.max(0, 1 - b.popT / 18);
            b.x += b.vx * dt * 0.6;
            b.y += b.vy * dt * 0.6;
            if (b.alpha <= 0) bubbles.splice(i, 1);
            continue;
        }

        // float up + gentle drift
        b.vy -= 0.02 * dt;
        b.vx *= 0.995;
        b.x += b.vx * dt;
        b.y += b.vy * dt;

        // wrap horizontally
        if (b.x < -b.r) b.x = W + b.r;
        if (b.x > W + b.r) b.x = -b.r;

        // When a non-treasure bubble reaches the top margin, wrap it to the bottom
        const topMargin = b.r + 6; // center stays at least this far from top
        if (b.y < topMargin) {
            // For all bubbles (including treasure), wrap to bottom so flow is continuous
            b.y = H + b.r + rand(6, 28);
            b.x = Math.max(b.r, Math.min(W - b.r, b.x + rand(-30, 30)));
            // reset upward velocity so it rises into view
            b.vy = rand(-1.1, -0.6);
            b.vx = rand(-0.12, 0.12);
        }

        // remove when fully off-screen (well above top) to avoid accidental unreachable pop
        if (b.y < -b.r * 2) {
            // only respawn if not game over and not the treasure
            if (!gameOver && !b.treasure) spawnBubble();
            bubbles.splice(i, 1);
        }
    }

    // softer inter-bubble separation
    for (let a = 0; a < bubbles.length; a++) {
        for (let b = a + 1; b < bubbles.length; b++) {
            const A = bubbles[a], B = bubbles[b];
            if (A.popped || B.popped) continue;
            const dx = B.x - A.x, dy = B.y - A.y;
            const dist2 = dx * dx + dy * dy;
            const minD = A.r + B.r;
            if (dist2 > 0 && dist2 < (minD * minD)) {
                const dist = Math.sqrt(dist2) || 0.01;
                const nx = dx / dist, ny = dy / dist;
                const overlap = (minD - dist) * 0.12;
                A.x -= nx * overlap;
                A.y -= ny * overlap;
                B.x += nx * overlap;
                B.y += ny * overlap;
                const mvx = (B.vx - A.vx) * 0.007;
                const mvy = (B.vy - A.vy) * 0.007;
                A.vx -= mvx; A.vy -= mvy;
                B.vx += mvx; B.vy += mvy;
                A.vx *= 0.995; A.vy *= 0.995;
                B.vx *= 0.995; B.vy *= 0.995;
            }
        }
    }
}

function draw() {
    ctx.clearRect(0, 0, W, H);
    // subtle background sheen
    const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
    bgGrad.addColorStop(0, 'rgba(255,255,255,0.02)');
    bgGrad.addColorStop(1, 'rgba(0,0,0,0.02)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, W, H);

    // draw bubbles: metallic effect using radial gradient + specular
    for (let b of bubbles) {
        ctx.save();
        ctx.globalAlpha = b.alpha;
        // main circle
        const g = ctx.createRadialGradient(b.x - b.r * 0.3, b.y - b.r * 0.45, b.r * 0.1, b.x, b.y, b.r);
        g.addColorStop(0, 'rgba(255,255,255,' + (0.7 * b.sparkle) + ')');
        g.addColorStop(0.18, 'rgba(255,255,255,' + (0.14 * b.sparkle) + ')');
        g.addColorStop(0.55, b.color);
        g.addColorStop(1, 'rgba(10,10,10,0.6)');
        ctx.beginPath();
        ctx.fillStyle = g;
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.fill();

        // small bright highlight
        ctx.globalCompositeOperation = 'lighter';
        const hx = b.x - b.r * 0.45;
        const hy = b.y - b.r * 0.6;
        const hg = ctx.createRadialGradient(hx, hy, 1, hx, hy, b.r * 0.6);
        hg.addColorStop(0, 'rgba(255,255,255,' + (0.9 * b.sparkle) + ')');
        hg.addColorStop(0.5, 'rgba(255,255,255,0.08)');
        hg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = hg;
        ctx.beginPath();
        ctx.arc(hx, hy, b.r * 0.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';

        // thin rim
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = Math.max(1, b.r * 0.06);
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
        ctx.stroke();

        // optional subtle label for debugging (disabled)
        // ctx.fillStyle = 'rgba(255,255,255,0.06)'; ctx.fillText(b.colorName + ' ' + b.sizeLevel, b.x-10, b.y+4);

        ctx.restore();
    }
}

// input: pointer/touch pop
function getPosFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches && e.touches.length) {
        return Array.from(e.touches).map(t => ({ x: t.clientX - rect.left, y: t.clientY - rect.top }));
    } else {
        return [{ x: e.clientX - rect.left, y: e.clientY - rect.top }];
    }
}

function handleTapAt(x, y) {
    if (gameOver || !interactionsEnabled) return; // ignore taps after finish or when interactions disabled
    // find nearest bubble under point (largest first)
    let hitIdx = -1, hitPrior = -1;
    for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (b.popped) continue;
        const dx = b.x - x, dy = b.y - y;
        if (dx * dx + dy * dy <= (b.r * b.r)) {
            if (b.r > hitPrior) { hitPrior = b.r; hitIdx = i; }
        }
    }
    if (hitIdx >= 0) {
        popBubble(bubbles[hitIdx], x, y);
    } else {
        // small spawn nudge where tapped
        for (let i = 0; i < 2; i++) spawnBubble(x + rand(-20, 20));
    }
}

// pointer/touch handlers
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const pts = getPosFromEvent(e);
    for (let p of pts) handleTapAt(p.x, p.y);
}, { passive: false });

canvas.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    handleTapAt(x, y);
}, { passive: false });

// reset
resetBtn.addEventListener('click', () => {
    bubbles = [];
    score = 0;
    gameOver = false;
    interactionsEnabled = true;
    updateScore();
    // prefill a few
    // pick new target and create it (setupTarget will also create the unique treasure bubble)
    setupTargetForSession();
    // prefill a few
    for (let i = 0; i < 10; i++) spawnBubble();
    // hide any persistent toasts
    toast.style.opacity = '0'; toast.setAttribute('aria-hidden', 'true');
    showToast('Reset - nouvelle partie');
});

// session target creation: choose color & size, then create exactly one matching bubble
function setupTargetForSession(code) {
    // choose randomly
    const c = pickColor();
    targetColorName = c.name;
    targetSizeLevel = Math.floor(rand(1, 6)); // 1..5
    if (code) targetCode = String(code);
    // ensure one exact matching bubble exists and is unique
    createTargetBubble(targetColorName, targetSizeLevel, targetCode);
    console.log('Target:', targetColorName, 'size', targetSizeLevel, 'code', targetCode);
}

// create exactly one target bubble (golden properties to stand out if wanted)
function createTargetBubble(colorName, sizeLevel, code) {
    // build color hex from name
    const col = COLORS.find(c => c.name === colorName) || pickColor();
    const r = getSizeForLevel(sizeLevel);
    // choose a horizontal position well inside the edges
    const bx = Math.max(r + 20, Math.min(W - r - 20, rand(r + 30, W - r - 30)));
    // place target within visible vertical bounds (25%..85% of height) so it's reachable
    const by = rand(H * 0.25, Math.max(H * 0.4, H * 0.85));
    const vx = rand(-0.08, 0.08);
    const vy = rand(-0.6, -0.2);
    bubbles.push({
        x: bx, y: by, vx, vy, r,
        colorName: col.name,
        color: col.hex,
        sizeLevel,
        alpha: 1, popped: false, popT: 0,
        sparkle: 1.2,
        treasure: true,
        code: String(code)
    });
}

// game loop
let last = performance.now();
function loop(now) {
    const dt = Math.min(60, now - last);
    last = now;
    update(dt / 16.666);
    draw();
    requestAnimationFrame(loop);
}

// initial target then population
setupTargetForSession(targetCode);
// initial population (ensure target uniqueness)
for (let i = 0; i < 12; i++) spawnBubble();
// remove one bubble of each color from the initial population (but never remove the treasure)
for (const col of COLORS) {
    for (let i = 0; i < bubbles.length; i++) {
        const b = bubbles[i];
        if (!b.treasure && b.colorName === col.name) {
            bubbles.splice(i, 1);
            break; // remove only one for this color
        }
    }
}
updateScore();
requestAnimationFrame(loop);

// expose helper for external control if needed
window.createTargetBubble = createTargetBubble;
window.setupTargetForSession = setupTargetForSession;
window._bubbles = bubbles;
