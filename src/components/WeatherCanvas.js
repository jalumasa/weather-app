import React, { useEffect, useRef } from "react";

/*
  Live weather background. Renders a full-viewport particle system behind the
  dashboard that reacts to whatever the API actually reported, so a rainy city
  really does rain on screen. Sits behind the glass cards (z-0) and never takes
  pointer events.

  Everything is drawn on one canvas driven by a single requestAnimationFrame
  loop, so adding scenes costs no extra timers and no dependencies.
*/

// OpenWeatherMap's `weather[0].main` -> the scene we should draw. Unknown
// conditions fall back to the calm ambient scene rather than an empty screen.
function resolveScene(condition, timeOfDay) {
  switch ((condition || "").toLowerCase()) {
    case "thunderstorm":
      return "storm";
    case "rain":
    case "drizzle":
      return "rain";
    case "snow":
      return "snow";
    case "clouds":
      return "clouds";
    case "mist":
    case "fog":
    case "haze":
    case "smoke":
    case "dust":
    case "sand":
      return "fog";
    case "clear":
      return timeOfDay === "night" ? "stars" : "sun";
    default:
      return timeOfDay === "night" ? "stars" : "sun";
  }
}

// Particle counts are derived from viewport area so a phone doesn't get the
// same 400 raindrops as a desktop (which would read as a downpour on a 375px
// screen, and murder the framerate).
function scaleCount(width, height, perMegapixel, max) {
  const megapixels = (width * height) / 1_000_000;
  return Math.min(max, Math.max(12, Math.round(megapixels * perMegapixel)));
}

const random = (min, max) => min + Math.random() * (max - min);

function createParticles(scene, width, height) {
  switch (scene) {
    case "rain":
    case "storm": {
      const count = scaleCount(width, height, 260, 420);
      return Array.from({ length: count }, () => ({
        x: random(-0.1 * width, 1.1 * width),
        y: random(-height, height),
        length: random(12, 26),
        speed: random(9, 16),
        alpha: random(0.18, 0.5),
        width: random(0.8, 1.6),
      }));
    }

    case "snow": {
      const count = scaleCount(width, height, 130, 220);
      return Array.from({ length: count }, () => ({
        x: random(0, width),
        y: random(-height, height),
        radius: random(1.2, 3.6),
        speed: random(0.5, 1.6),
        sway: random(0.4, 1.2),
        phase: random(0, Math.PI * 2),
        drift: random(14, 42),
        alpha: random(0.35, 0.85),
      }));
    }

    case "stars": {
      const count = scaleCount(width, height, 190, 300);
      return Array.from({ length: count }, () => ({
        x: random(0, width),
        // Bias stars toward the upper sky so the lower half stays readable.
        y: random(0, height * 0.85),
        radius: random(0.4, 1.5),
        phase: random(0, Math.PI * 2),
        twinkle: random(0.6, 2.2),
        alpha: random(0.35, 0.95),
      }));
    }

    case "sun": {
      const count = scaleCount(width, height, 55, 90);
      return Array.from({ length: count }, () => ({
        x: random(0, width),
        y: random(0, height),
        radius: random(1, 3.4),
        speedY: random(-0.35, -0.08),
        speedX: random(-0.12, 0.28),
        phase: random(0, Math.PI * 2),
        alpha: random(0.15, 0.45),
      }));
    }

    case "clouds": {
      const count = scaleCount(width, height, 9, 16);
      return Array.from({ length: count }, () => ({
        x: random(-0.2 * width, 1.2 * width),
        y: random(0, height * 0.75),
        radius: random(70, 190),
        speed: random(0.08, 0.32),
        alpha: random(0.05, 0.13),
      }));
    }

    case "fog": {
      const count = scaleCount(width, height, 7, 12);
      return Array.from({ length: count }, () => ({
        x: random(-0.2 * width, 1.2 * width),
        y: random(0, height),
        radius: random(120, 280),
        speed: random(0.12, 0.4),
        alpha: random(0.05, 0.12),
      }));
    }

    default:
      return [];
  }
}

// Soft round blob used for clouds/fog/sun motes. Cheaper and better looking
// than a real blur filter, which tanks framerate on canvas.
function drawBlob(ctx, x, y, radius, alpha, tint) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, `rgba(${tint}, ${alpha})`);
  gradient.addColorStop(1, `rgba(${tint}, 0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// A jagged bolt built by walking downward with random horizontal jitter.
function drawLightningBolt(ctx, startX, height) {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
  ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(190, 220, 255, 0.9)";
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(startX, 0);

  let x = startX;
  let y = 0;
  const segment = height / 9;
  while (y < height * 0.7) {
    y += segment;
    x += random(-38, 38);
    ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function WeatherCanvas({ condition, timeOfDay }) {
  const canvasRef = useRef(null);
  const sceneRef = useRef(resolveScene(condition, timeOfDay));

  // Keep the scene in a ref so a condition change doesn't tear down and
  // restart the animation loop - the loop just starts drawing something else.
  sceneRef.current = resolveScene(condition, timeOfDay);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d");

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let width = 0;
    let height = 0;
    let particles = [];
    let activeScene = sceneRef.current;
    let frame = null;
    let start = performance.now();

    // Lightning state for the storm scene.
    let flash = 0;
    let boltX = 0;
    let nextStrike = random(1200, 4200);

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      particles = createParticles(activeScene, width, height);
    };

    const render = (now) => {
      const elapsed = now - start;
      const seconds = elapsed / 1000;

      // Rebuild the particle field when the weather changes underneath us.
      if (sceneRef.current !== activeScene) {
        activeScene = sceneRef.current;
        particles = createParticles(activeScene, width, height);
      }

      ctx.clearRect(0, 0, width, height);

      switch (activeScene) {
        case "rain":
        case "storm": {
          ctx.lineCap = "round";
          particles.forEach((drop) => {
            ctx.strokeStyle = `rgba(255, 255, 255, ${drop.alpha})`;
            ctx.lineWidth = drop.width;
            ctx.beginPath();
            ctx.moveTo(drop.x, drop.y);
            // Slight lean so rain reads as wind-driven rather than a barcode.
            ctx.lineTo(drop.x + drop.length * 0.22, drop.y + drop.length);
            ctx.stroke();

            drop.y += drop.speed;
            drop.x += drop.speed * 0.22;
            if (drop.y > height) {
              drop.y = random(-120, -10);
              drop.x = random(-0.1 * width, 1.1 * width);
            }
          });

          if (activeScene === "storm") {
            if (elapsed > nextStrike) {
              flash = 1;
              boltX = random(width * 0.15, width * 0.85);
              nextStrike = elapsed + random(2600, 7000);
            }
            if (flash > 0) {
              ctx.fillStyle = `rgba(226, 236, 255, ${flash * 0.32})`;
              ctx.fillRect(0, 0, width, height);
              if (flash > 0.55) drawLightningBolt(ctx, boltX, height);
              flash -= 0.045;
            }
          }
          break;
        }

        case "snow": {
          particles.forEach((flake) => {
            const x = flake.x + Math.sin(seconds * flake.sway + flake.phase) * flake.drift;
            ctx.fillStyle = `rgba(255, 255, 255, ${flake.alpha})`;
            ctx.beginPath();
            ctx.arc(x, flake.y, flake.radius, 0, Math.PI * 2);
            ctx.fill();

            flake.y += flake.speed;
            if (flake.y > height + 10) {
              flake.y = random(-60, -10);
              flake.x = random(0, width);
            }
          });
          break;
        }

        case "stars": {
          particles.forEach((star) => {
            const twinkle = 0.55 + 0.45 * Math.sin(seconds * star.twinkle + star.phase);
            ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha * twinkle})`;
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            ctx.fill();
          });

          // A shooting star every so often, on a deterministic cycle so it
          // feels like a rhythm rather than random noise.
          const cycle = 9;
          const progress = (seconds % cycle) / cycle;
          if (progress < 0.12) {
            const t = progress / 0.12;
            const streakX = width * 0.15 + t * width * 0.55;
            const streakY = height * 0.12 + t * height * 0.3;
            const trail = 130;
            const gradient = ctx.createLinearGradient(
              streakX, streakY, streakX - trail, streakY - trail * 0.55
            );
            gradient.addColorStop(0, `rgba(255, 255, 255, ${0.9 * (1 - t)})`);
            gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
            ctx.strokeStyle = gradient;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(streakX, streakY);
            ctx.lineTo(streakX - trail, streakY - trail * 0.55);
            ctx.stroke();
          }
          break;
        }

        case "sun": {
          // Warm glow anchored top-right, breathing slowly.
          const pulse = 0.5 + 0.5 * Math.sin(seconds * 0.5);
          drawBlob(
            ctx, width * 0.82, height * 0.08,
            Math.min(width, height) * 0.55,
            0.1 + pulse * 0.05, "255, 214, 138"
          );

          particles.forEach((mote) => {
            ctx.fillStyle = `rgba(255, 245, 214, ${mote.alpha})`;
            ctx.beginPath();
            ctx.arc(mote.x, mote.y, mote.radius, 0, Math.PI * 2);
            ctx.fill();

            mote.y += mote.speedY;
            mote.x += mote.speedX + Math.sin(seconds * 0.6 + mote.phase) * 0.14;
            if (mote.y < -10) {
              mote.y = height + 10;
              mote.x = random(0, width);
            }
            if (mote.x < -10) mote.x = width + 10;
            if (mote.x > width + 10) mote.x = -10;
          });
          break;
        }

        case "clouds":
        case "fog": {
          particles.forEach((cloud) => {
            drawBlob(ctx, cloud.x, cloud.y, cloud.radius, cloud.alpha, "255, 255, 255");
            cloud.x += cloud.speed;
            if (cloud.x - cloud.radius > width) {
              cloud.x = -cloud.radius;
              cloud.y = random(0, activeScene === "fog" ? height : height * 0.75);
            }
          });
          break;
        }

        default:
          break;
      }

      frame = requestAnimationFrame(render);
    };

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      // Draw a single static frame so the scene still reads, without motion.
      render(performance.now());
      if (frame) cancelAnimationFrame(frame);
    } else {
      frame = requestAnimationFrame(render);
    }

    return () => {
      window.removeEventListener("resize", resize);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    />
  );
}

export default WeatherCanvas;
