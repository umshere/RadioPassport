import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hue: "gold" | "blue" | "ivory";
};

type Note = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  rotation: number;
  spin: number;
  glyph: "♪" | "♫" | "♬";
  hue: "gold" | "ivory";
};

const GOLD = "245, 177, 45";
const BLUE = "92, 158, 173";
const IVORY = "244, 237, 224";
const NOTE_GLYPHS: Note["glyph"][] = ["♪", "♫", "♬"];

function getParticleCount(width: number) {
  if (width < 640) return 34;
  if (width < 1024) return 52;
  return 72;
}

function createParticles(width: number, height: number) {
  const count = getParticleCount(width);
  const particles: Particle[] = [];

  for (let index = 0; index < count; index += 1) {
    const variant = index % 9;
    const hue =
      variant === 0 || variant === 5
        ? "gold"
        : variant === 3
          ? "ivory"
          : "blue";

    particles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      radius: 1 + Math.random() * 2.8,
      alpha: 0.24 + Math.random() * 0.36,
      hue,
    });
  }

  return particles;
}

function getNoteCount(width: number) {
  if (width < 640) return 3;
  if (width < 1024) return 5;
  return 7;
}

function createNotes(width: number, height: number) {
  const count = getNoteCount(width);
  const notes: Note[] = [];

  for (let index = 0; index < count; index += 1) {
    notes.push({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: 0.08 + Math.random() * 0.2,
      vy: (Math.random() - 0.5) * 0.08,
      size: 14 + Math.random() * 18,
      alpha: 0.1 + Math.random() * 0.16,
      rotation: (Math.random() - 0.5) * 0.35,
      spin: (Math.random() - 0.5) * 0.002,
      glyph: NOTE_GLYPHS[index % NOTE_GLYPHS.length] ?? "♪",
      hue: index % 3 === 0 ? "ivory" : "gold",
    });
  }

  return notes;
}

function particleColor(hue: Particle["hue"], alpha: number) {
  if (hue === "gold") return `rgba(${GOLD}, ${alpha})`;
  if (hue === "ivory") return `rgba(${IVORY}, ${alpha})`;
  return `rgba(${BLUE}, ${alpha})`;
}

export function SignalField() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.35 };
    let particles = createParticles(window.innerWidth, window.innerHeight);
    let notes = createNotes(window.innerWidth, window.innerHeight);
    let animationFrame = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;

      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = createParticles(width, height);
      notes = createNotes(width, height);
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);

      const cursorGlow = context.createRadialGradient(
        pointer.x,
        pointer.y,
        0,
        pointer.x,
        pointer.y,
        Math.min(width, height) * 0.22
      );
      cursorGlow.addColorStop(0, "rgba(245, 177, 45, 0.12)");
      cursorGlow.addColorStop(0.38, "rgba(92, 158, 173, 0.08)");
      cursorGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
      context.fillStyle = cursorGlow;
      context.fillRect(0, 0, width, height);

      const waveConfigs = [
        { y: height * 0.22, amp: 18, color: `rgba(${BLUE}, 0.16)`, width: 1.2, speed: 0.0009 },
        { y: height * 0.36, amp: 24, color: `rgba(${GOLD}, 0.12)`, width: 1.4, speed: 0.0011 },
        { y: height * 0.54, amp: 16, color: `rgba(${IVORY}, 0.08)`, width: 1, speed: 0.0007 },
      ];

      waveConfigs.forEach((wave, waveIndex) => {
        context.beginPath();
        context.strokeStyle = wave.color;
        context.lineWidth = wave.width;

        for (let x = 0; x <= width; x += 8) {
          const y =
            wave.y +
            Math.sin(x * 0.012 + performance.now() * wave.speed + waveIndex) * wave.amp +
            (pointer.x / width - 0.5) * 14;

          if (x === 0) {
            context.moveTo(x, y);
          } else {
            context.lineTo(x, y);
          }
        }

        context.stroke();
      });

      let particleIndex = 0;
      for (const particle of particles) {

        if (!mediaQuery.matches) {
          particle.x += particle.vx;
          particle.y += particle.vy;

          const driftX = (pointer.x - width / 2) * 0.000015 * (particleIndex % 5 === 0 ? 1.4 : 1);
          const driftY = (pointer.y - height / 2) * 0.000015;
          particle.vx += driftX;
          particle.vy += driftY;
          particle.vx *= 0.995;
          particle.vy *= 0.995;
        }

        if (particle.x < -20) particle.x = width + 20;
        if (particle.x > width + 20) particle.x = -20;
        if (particle.y < -20) particle.y = height + 20;
        if (particle.y > height + 20) particle.y = -20;

        const distanceToPointer = Math.hypot(pointer.x - particle.x, pointer.y - particle.y);
        const pointerBoost = Math.max(0, 1 - distanceToPointer / 240);
        const alpha = particle.alpha + pointerBoost * 0.22;

        context.beginPath();
        context.fillStyle = particleColor(particle.hue, alpha);
        context.shadowBlur = particle.hue === "gold" ? 24 : 16;
        context.shadowColor = particleColor(particle.hue, alpha * 0.6);
        context.arc(
          particle.x,
          particle.y,
          particle.radius + pointerBoost * 1,
          0,
          Math.PI * 2
        );
        context.fill();
        particleIndex += 1;
      }

      context.shadowBlur = 0;

      context.textAlign = "center";
      context.textBaseline = "middle";

      let noteIndex = 0;
      for (const note of notes) {

        if (!mediaQuery.matches) {
          note.x += note.vx;
          note.y += note.vy;
          note.rotation += note.spin;

          const pointerLift = Math.max(0, 1 - Math.hypot(pointer.x - note.x, pointer.y - note.y) / 320);
          note.vx += (pointer.x / width - 0.5) * 0.0008 * (noteIndex % 2 === 0 ? -1 : 1);
          note.vy -= pointerLift * 0.0025;
          note.vx *= 0.995;
          note.vy *= 0.992;
        }

        if (note.x < -40) note.x = width + 40;
        if (note.x > width + 40) note.x = -40;
        if (note.y < -40) note.y = height + 40;
        if (note.y > height + 40) note.y = -40;

        const distanceToPointer = Math.hypot(pointer.x - note.x, pointer.y - note.y);
        const pointerBoost = Math.max(0, 1 - distanceToPointer / 260);
        const alpha = Math.min(0.36, note.alpha + pointerBoost * 0.14);

        context.save();
        context.translate(note.x, note.y);
        context.rotate(note.rotation + Math.sin(performance.now() * 0.0004 + noteIndex) * 0.08);
        context.fillStyle = note.hue === "gold" ? `rgba(${GOLD}, ${alpha})` : `rgba(${IVORY}, ${alpha})`;
        context.shadowBlur = note.hue === "gold" ? 18 : 12;
        context.shadowColor =
          note.hue === "gold" ? `rgba(${GOLD}, ${alpha * 0.7})` : `rgba(${IVORY}, ${alpha * 0.6})`;
        context.font = `${note.size + pointerBoost * 4}px "Times New Roman", serif`;
        context.fillText(note.glyph, 0, 0);
        context.restore();
        noteIndex += 1;
      }

      context.shadowBlur = 0;

      for (const particle of particles) {
        const distanceToPointer = Math.hypot(pointer.x - particle.x, pointer.y - particle.y);

        if (distanceToPointer < 220) {
          context.beginPath();
          context.strokeStyle = `rgba(${particle.hue === "gold" ? GOLD : BLUE}, ${
            0.04 + (1 - distanceToPointer / 220) * 0.12
          })`;
          context.lineWidth = 1;
          context.moveTo(particle.x, particle.y);
          context.lineTo(
            particle.x + (pointer.x - particle.x) * 0.18,
            particle.y + (pointer.y - particle.y) * 0.18
          );
          context.stroke();
        }
      }

      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    draw();

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", handlePointerMove, { passive: true });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", handlePointerMove);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full opacity-95 [mix-blend-mode:screen]"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.04),transparent_26%),radial-gradient(circle_at_center,transparent_0%,rgba(2,12,25,0.18)_68%,rgba(2,12,25,0.34)_100%)]" />
    </div>
  );
}
