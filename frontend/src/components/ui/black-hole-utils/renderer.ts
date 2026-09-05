export interface RendererOptions {
  canvas: HTMLCanvasElement;
}

export interface BlackHoleRenderer {
  ready: Promise<void>;
  dispose: () => void;
}

export function createRenderer({ canvas }: RendererOptions): BlackHoleRenderer {
  let animationFrameId: number;
  let isDisposed = false;
  const ctx = canvas.getContext("2d");

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  const handleResize = () => {
    if (!canvas) return;
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  };
  window.addEventListener("resize", handleResize);

  // Starfield background
  const starsCount = 220;
  const stars = Array.from({ length: starsCount }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 1.4 + 0.4,
    alpha: Math.random() * 0.8 + 0.2,
    speed: Math.random() * 0.005 + 0.001,
  }));

  // Fiery Black Hole Accretion Disk Particles (Golden Yellow, Warm Orange, Fiery Red-Amber)
  const particleCount = 420;
  const particles = Array.from({ length: particleCount }, () => {
    const angle = Math.random() * Math.PI * 2;
    const distance = 80 + Math.random() * 260;
    const speed = (0.014 + Math.random() * 0.02) * (180 / distance);
    // Warm fiery hues: 25 to 48 (deep amber-orange to bright gold-yellow)
    const hue = Math.floor(22 + Math.random() * 28);
    return {
      angle,
      distance,
      speed,
      size: Math.random() * 2.2 + 0.8,
      alpha: Math.random() * 0.7 + 0.3,
      hue,
      lightness: Math.floor(48 + Math.random() * 45), // 48% to 93% for glowing embers
    };
  });

  let time = 0;

  const render = () => {
    if (isDisposed || !ctx) return;

    // Deep cosmic space clearing
    ctx.fillStyle = "rgba(4, 3, 2, 0.25)";
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    // 1. Starfield
    ctx.fillStyle = "#ffffff";
    for (const star of stars) {
      star.alpha += Math.sin(time * star.speed * 20) * 0.008;
      const alpha = Math.max(0.1, Math.min(0.9, star.alpha));
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 2. Gravitational Lensing Outer Halo (Deep Amber & Fiery Orange Glow)
    const outerGlow = ctx.createRadialGradient(
      centerX,
      centerY,
      50,
      centerX,
      centerY,
      360
    );
    outerGlow.addColorStop(0, "rgba(255, 140, 0, 0.35)");
    outerGlow.addColorStop(0.25, "rgba(255, 100, 0, 0.22)");
    outerGlow.addColorStop(0.6, "rgba(200, 60, 0, 0.08)");
    outerGlow.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 360, 0, Math.PI * 2);
    ctx.fill();

    // 3. Swirling Fiery Orange & Golden Yellow Accretion Disk
    for (const p of particles) {
      p.angle += p.speed;
      const tilt = 0.42;
      const currentDist = p.distance + Math.sin(time * 2 + p.angle) * 7;
      const x = centerX + Math.cos(p.angle) * currentDist;
      const y = centerY + Math.sin(p.angle) * currentDist * tilt;

      const color = `hsla(${p.hue}, 100%, ${p.lightness}%, ${p.alpha})`;
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(255, 160, 20, 0.9)";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;

    // 4. Photon Ring (Blazing Golden-Yellow Boundary)
    const photonRing = ctx.createRadialGradient(
      centerX,
      centerY,
      54,
      centerX,
      centerY,
      72
    );
    photonRing.addColorStop(0, "rgba(255, 255, 240, 0.98)");
    photonRing.addColorStop(0.25, "rgba(255, 215, 0, 0.9)");
    photonRing.addColorStop(0.65, "rgba(255, 120, 0, 0.45)");
    photonRing.addColorStop(1, "rgba(0, 0, 0, 0)");

    ctx.fillStyle = photonRing;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 72, 0, Math.PI * 2);
    ctx.fill();

    // 5. Event Horizon (Pure Black Void Center)
    ctx.fillStyle = "#000000";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 54, 0, Math.PI * 2);
    ctx.fill();

    time += 0.016;
    animationFrameId = requestAnimationFrame(render);
  };

  render();

  return {
    ready: Promise.resolve(),
    dispose: () => {
      isDisposed = true;
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    },
  };
}
