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

    // 6. Gestion du Gyroscope
    window.addEventListener('deviceorientation', (event) => {
        // Gamma : inclinaison gauche/droite (-90 à 90)
        // Beta : inclinaison avant/arrière (-180 à 180)
        let gx = event.gamma / 20;
        let gy = event.beta / 20;

        // Limiter la force
        engine.world.gravity.x = Math.max(Math.min(gx, 2), -2);
        engine.world.gravity.y = Math.max(Math.min(gy, 2), -2);
    });
}

// Gestion du bouton de démarrage (pour les permissions mobiles)
startBtn.addEventListener('click', () => {
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permissionState => {
                if (permissionState === 'granted') {
                    overlay.style.display = 'none';
                    initGame();
                }
            })
            .catch(console.error);
    } else {
        // Pour les navigateurs qui ne demandent pas de permission (Android)
        overlay.style.display = 'none';
        initGame();
    }
});

// Ajuster la taille si la fenêtre change
window.addEventListener('resize', () => {
    if (render) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
});