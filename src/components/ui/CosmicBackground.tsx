import { useEffect, useRef } from 'react';

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

interface Planet {
  x: number;
  y: number;
  size: number;
  color: string;
  orbitRadius: number;
  angle: number;
  speed: number;
  hasRing?: boolean;
}

export function CosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const starsRef = useRef<Star[]>([]);
  const planetsRef = useRef<Planet[]>([]);
  const animationRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initStars();
      initPlanets();
    };

    const initStars = () => {
      starsRef.current = [];
      const starCount = Math.floor((canvas.width * canvas.height) / 8000);
      
      for (let i = 0; i < starCount; i++) {
        starsRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          size: Math.random() * 2 + 0.5,
          opacity: Math.random() * 0.8 + 0.2,
          speed: Math.random() * 0.5 + 0.1,
        });
      }
    };

    const initPlanets = () => {
      const colors = [
        'rgba(200, 170, 130, 0.6)', // Gold
        'rgba(100, 140, 180, 0.5)', // Blue
        'rgba(180, 140, 160, 0.5)', // Pink
        'rgba(140, 180, 160, 0.5)', // Teal
        'rgba(160, 130, 180, 0.5)', // Purple
      ];

      planetsRef.current = [
        {
          x: canvas.width * 0.8,
          y: canvas.height * 0.2,
          size: 60,
          color: colors[0],
          orbitRadius: 0,
          angle: 0,
          speed: 0.0005,
          hasRing: true,
        },
        {
          x: canvas.width * 0.15,
          y: canvas.height * 0.7,
          size: 40,
          color: colors[1],
          orbitRadius: 0,
          angle: Math.PI,
          speed: 0.0008,
        },
        {
          x: canvas.width * 0.6,
          y: canvas.height * 0.8,
          size: 25,
          color: colors[2],
          orbitRadius: 0,
          angle: Math.PI / 2,
          speed: 0.001,
        },
      ];
    };

    const drawStar = (star: Star, time: number) => {
      const twinkle = Math.sin(time * star.speed * 10 + star.x) * 0.3 + 0.7;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 250, 240, ${star.opacity * twinkle})`;
      ctx.fill();

      // Add glow effect for larger stars
      if (star.size > 1.5) {
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size * 3, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(
          star.x, star.y, 0,
          star.x, star.y, star.size * 3
        );
        gradient.addColorStop(0, `rgba(255, 250, 240, ${star.opacity * twinkle * 0.3})`);
        gradient.addColorStop(1, 'rgba(255, 250, 240, 0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    };

    const drawPlanet = (planet: Planet, time: number) => {
      // Floating animation
      const floatY = Math.sin(time * 0.001 + planet.angle) * 10;
      const floatX = Math.cos(time * 0.0008 + planet.angle) * 5;
      const x = planet.x + floatX;
      const y = planet.y + floatY;

      // Planet glow
      const glowGradient = ctx.createRadialGradient(
        x, y, 0,
        x, y, planet.size * 2
      );
      glowGradient.addColorStop(0, planet.color);
      glowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.beginPath();
      ctx.arc(x, y, planet.size * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      // Planet body
      const bodyGradient = ctx.createRadialGradient(
        x - planet.size * 0.3, y - planet.size * 0.3, 0,
        x, y, planet.size
      );
      bodyGradient.addColorStop(0, planet.color.replace('0.5', '0.8').replace('0.6', '0.9'));
      bodyGradient.addColorStop(1, planet.color.replace('0.5', '0.3').replace('0.6', '0.4'));
      ctx.beginPath();
      ctx.arc(x, y, planet.size, 0, Math.PI * 2);
      ctx.fillStyle = bodyGradient;
      ctx.fill();

      // Ring for Saturn-like planet
      if (planet.hasRing) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(0.4);
        ctx.scale(1, 0.3);
        ctx.beginPath();
        ctx.arc(0, 0, planet.size * 1.8, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(200, 180, 150, 0.4)';
        ctx.lineWidth = planet.size * 0.15;
        ctx.stroke();
        ctx.restore();
      }
    };

    const drawShootingStar = (time: number) => {
      const shouldShow = Math.sin(time * 0.0001) > 0.99;
      if (shouldShow) {
        const startX = Math.random() * canvas.width;
        const startY = Math.random() * canvas.height * 0.5;
        const length = 100 + Math.random() * 100;
        
        const gradient = ctx.createLinearGradient(
          startX, startY,
          startX + length, startY + length * 0.5
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(startX + length, startY + length * 0.5);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    };

    const animate = (time: number) => {
      ctx.fillStyle = 'rgba(10, 15, 30, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw stars
      starsRef.current.forEach(star => drawStar(star, time));

      // Draw planets
      planetsRef.current.forEach(planet => drawPlanet(planet, time));

      // Occasionally draw shooting star
      drawShootingStar(time);

      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ background: 'linear-gradient(135deg, hsl(220 40% 8%) 0%, hsl(240 30% 12%) 50%, hsl(260 25% 10%) 100%)' }}
    />
  );
}
