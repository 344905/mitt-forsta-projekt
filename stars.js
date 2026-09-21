// Enkel animerad stjärnhimmel som ritas på en <canvas> bakom hela spelet.
const canvas = document.getElementById("starfield");
const ctx = canvas.getContext("2d");

const STAR_COUNT = 120;
let stars = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

function createStars() {
  stars = [];
  for (let i = 0; i < STAR_COUNT; i++) {
    stars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() < 0.15 ? 3 : 2, // några stjärnor lite större
      speed: 0.2 + Math.random() * 0.6,
      twinkleOffset: Math.random() * Math.PI * 2,
    });
  }
}

function draw(time) {
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const star of stars) {
    // Stjärnan vandrar sakta nedåt och börjar om upptill.
    star.y += star.speed;
    if (star.y > canvas.height) {
      star.y = 0;
      star.x = Math.random() * canvas.width;
    }

    // Blinkeffekt: opaciteten pulserar med en sinuskurva över tid.
    const twinkle = 0.5 + 0.5 * Math.sin(time / 500 + star.twinkleOffset);
    ctx.globalAlpha = 0.4 + twinkle * 0.6;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(star.x, star.y, star.size, star.size);
  }
  ctx.globalAlpha = 1;

  requestAnimationFrame(draw);
}

window.addEventListener("resize", () => {
  resizeCanvas();
  createStars();
});

resizeCanvas();
createStars();
requestAnimationFrame(draw);
