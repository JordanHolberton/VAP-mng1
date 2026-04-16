const canvas = document.getElementById('liquidCanvas');
const ctx = canvas.getContext('2d');

let isDrawing = false;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    fillLiquid();
}

// Remplit l'écran de "Mercure" noir
function fillLiquid() {
    ctx.fillStyle = '#0a0a0a'; // Noir profond
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Optionnel : Ajouter des reflets gris pour l'effet métal
    for (let i = 0; i < 20; i++) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, 100, 0, Math.PI * 2);
        ctx.fill();
    }
}

function scrub(x, y) {
    ctx.globalCompositeOperation = 'destination-out'; // C'est la clé : ça efface le canvas

    // On crée un dégradé radial pour faire une "bulle" de transparence
    const gradient = ctx.createRadialGradient(x, y, 10, x, y, 50);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, 50, 0, Math.PI * 2);
    ctx.fill();
}

// Événements Tactiles
canvas.addEventListener('touchstart', (e) => {
    isDrawing = true;
    scrub(e.touches[0].clientX, e.touches[0].clientY);
});

canvas.addEventListener('touchmove', (e) => {
    if (!isDrawing) return;
    scrub(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault();
});

canvas.addEventListener('touchend', () => isDrawing = false);

// Redessiner si on tourne le téléphone
window.addEventListener('resize', resize);
resize();