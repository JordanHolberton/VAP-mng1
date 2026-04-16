const { Engine, Render, Runner, Bodies, Composite } = Matter;

let engine, render, runner;
const canvas = document.getElementById('liquidCanvas');
const startBtn = document.getElementById('startBtn');
const overlay = document.getElementById('overlay');

// Configuration du liquide
const PARTICLE_COUNT = 180; // Nombre de gouttes
const PARTICLE_RADIUS = 28; // Taille des gouttes

function initGame() {
    // 1. Création du moteur physique
    engine = Engine.create();

    // 2. Création du rendu
    render = Render.create({
        canvas: canvas,
        engine: engine,
        options: {
            width: window.innerWidth,
            height: window.innerHeight,
            background: 'transparent',
            wireframes: false
        }
    });

    // 3. Murs invisibles pour retenir le liquide
    const wallOptions = { isStatic: true, render: { visible: false } };
    const walls = [
        Bodies.rectangle(window.innerWidth / 2, -50, window.innerWidth, 100, wallOptions), // Haut
        Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 50, window.innerWidth, 100, wallOptions), // Bas
        Bodies.rectangle(-50, window.innerHeight / 2, 100, window.innerHeight, wallOptions), // Gauche
        Bodies.rectangle(window.innerWidth + 50, window.innerHeight / 2, 100, window.innerHeight, wallOptions) // Droite
    ];

    // 4. Création des particules de liquide
    const particles = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
        particles.push(
            Bodies.circle(
                Math.random() * window.innerWidth,
                Math.random() * window.innerHeight,
                PARTICLE_RADIUS,
                {
                    friction: 0.001,
                    restitution: 0.1,
                    density: 0.01,
                    render: { fillStyle: '#000000' }
                }
            )
        );
    }

    Composite.add(engine.world, [...walls, ...particles]);

    // 5. Lancement
    Render.run(render);
    runner = Runner.create();
    Runner.run(runner, engine);

    // 6. Gestion du Gyroscope (version plus robuste + lissage)
    let lastGx = 0;
    let lastGy = 0;
    const SMOOTH = 0.12; // 0-1 : plus haut = moins lissé

    function handleDeviceOrientation(event) {
        // certains devices peuvent renvoyer null/undefined ; on protège
        const gamma = (typeof event.gamma === 'number') ? event.gamma : 0; // gauche/droite
        const beta = (typeof event.beta === 'number') ? event.beta : 0; // avant/arrière

        // Mapping sensible : diviser pour éviter valeurs extrêmes
        const rawGx = gamma / 20; // ajuster sensibilité
        const rawGy = beta / 20;

        // Lissage
        lastGx += (rawGx - lastGx) * SMOOTH;
        lastGy += (rawGy - lastGy) * SMOOTH;

        // Clamp et appliqué au monde
        engine.world.gravity.x = Math.max(Math.min(lastGx, 2), -2);
        engine.world.gravity.y = Math.max(Math.min(lastGy, 2), -2);
    }

    window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true });

    // Debug minimal : si tu veux voir dans la console si des événements arrivent
    let sawEvent = false;
    const dbg = (e) => {
        if (!sawEvent) {
            console.log('deviceorientation reçu :', e.alpha, e.beta, e.gamma);
            sawEvent = true;
            window.removeEventListener('deviceorientation', dbg);
        }
    };
    window.addEventListener('deviceorientation', dbg, { passive: true });
}

// Gestion du bouton de démarrage (pour les permissions mobiles)
async function requestOrientationPermissionIfNeeded() {
    // iOS Safari nécessite DeviceOrientationEvent.requestPermission() appelé depuis une interaction utilisateur
    try {
        if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
            const state = await DeviceOrientationEvent.requestPermission();
            return state === 'granted';
        }
        // Certains appareils/browsers utilisent DeviceMotionEvent.requestPermission
        if (typeof DeviceMotionEvent !== 'undefined' && typeof DeviceMotionEvent.requestPermission === 'function') {
            const state = await DeviceMotionEvent.requestPermission();
            return state === 'granted';
        }
        // Pas d'API de permission → autorisé par défaut (Android / desktop)
        return true;
    } catch (err) {
        console.error('Permission request failed', err);
        return false;
    }
}

startBtn.addEventListener('click', async () => {
    // appel depuis un geste utilisateur -> requis par iOS
    const ok = await requestOrientationPermissionIfNeeded();
    if (!ok) {
        console.warn('Permission gyroscope non accordée. Le jeu ne fonctionnera pas sans permission.');
        // Tu veux absolument le gyroscope : arrête ici si refusé
        return;
    }
    overlay.style.display = 'none';
    initGame();
});

// Ajuster la taille si la fenêtre change
window.addEventListener('resize', () => {
    if (render) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});