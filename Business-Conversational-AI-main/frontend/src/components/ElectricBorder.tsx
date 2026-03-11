import React, { useEffect, useRef, useCallback } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import './ElectricBorder.css';

interface ElectricBorderProps {
  children?: ReactNode;
  color?: string;
  speed?: number;
  chaos?: number;
  borderRadius?: number;
  className?: string;
  style?: CSSProperties;
}

const ElectricBorder: React.FC<ElectricBorderProps> = ({
  children,
  color = '#5227FF',
  speed = 1,
  chaos = 0.12,
  borderRadius = 24,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const timeRef = useRef(0);
  const lastFrameTimeRef = useRef(0);

  const random = useCallback((x: number): number => {
    return (Math.sin(x * 12.9898) * 43758.5453) % 1;
  }, []);

  const noise2D = useCallback(
    (x: number, y: number): number => {
      const i = Math.floor(x);
      const j = Math.floor(y);
      const fx = x - i;
      const fy = y - j;
      const a = random(i + j * 57);
      const b = random(i + 1 + j * 57);
      const c = random(i + (j + 1) * 57);
      const d = random(i + 1 + (j + 1) * 57);
      const ux = fx * fx * (3.0 - 2.0 * fx);
      const uy = fy * fy * (3.0 - 2.0 * fy);
      return a * (1 - ux) * (1 - uy) + b * ux * (1 - uy) + c * (1 - ux) * uy + d * ux * uy;
    },
    [random]
  );

  const octavedNoise = useCallback(
    (x: number, octaves: number, lacunarity: number, gain: number, baseAmplitude: number, baseFrequency: number, time: number, seed: number, baseFlatness: number): number => {
      let y = 0;
      let amplitude = baseAmplitude;
      let frequency = baseFrequency;
      for (let i = 0; i < octaves; i++) {
        let octaveAmplitude = amplitude;
        if (i === 0) octaveAmplitude *= baseFlatness;
        y += octaveAmplitude * noise2D(frequency * x + seed * 100, time * frequency * 0.3);
        frequency *= lacunarity;
        amplitude *= gain;
      }
      return y;
    },
    [noise2D]
  );

  const getCornerPoint = useCallback((centerX: number, centerY: number, radius: number, startAngle: number, arcLength: number, progress: number): { x: number; y: number } => {
    const angle = startAngle + progress * arcLength;
    return { x: centerX + radius * Math.cos(angle), y: centerY + radius * Math.sin(angle) };
  }, []);

  const getRoundedRectPoint = useCallback((t: number, left: number, top: number, width: number, height: number, radius: number): { x: number; y: number } => {
    const straightWidth = width - 2 * radius;
    const straightHeight = height - 2 * radius;
    const cornerArc = (Math.PI * radius) / 2;
    const totalPerimeter = 2 * straightWidth + 2 * straightHeight + 4 * cornerArc;
    const distance = t * totalPerimeter;
    let accumulated = 0;
    if (distance <= accumulated + straightWidth) return { x: left + radius + (distance - accumulated), y: top };
    accumulated += straightWidth;
    if (distance <= accumulated + cornerArc) return getCornerPoint(left + width - radius, top + radius, radius, -Math.PI / 2, Math.PI / 2, (distance - accumulated) / cornerArc);
    accumulated += cornerArc;
    if (distance <= accumulated + straightHeight) return { x: left + width, y: top + radius + (distance - accumulated) };
    accumulated += straightHeight;
    if (distance <= accumulated + cornerArc) return getCornerPoint(left + width - radius, top + height - radius, radius, 0, Math.PI / 2, (distance - accumulated) / cornerArc);
    accumulated += cornerArc;
    if (distance <= accumulated + straightWidth) return { x: left + width - radius - (distance - accumulated), y: top + height };
    accumulated += straightWidth;
    if (distance <= accumulated + cornerArc) return getCornerPoint(left + radius, top + height - radius, radius, Math.PI / 2, Math.PI / 2, (distance - accumulated) / cornerArc);
    accumulated += cornerArc;
    if (distance <= accumulated + straightHeight) return { x: left, y: top + height - radius - (distance - accumulated) };
    accumulated += straightHeight;
    return getCornerPoint(left + radius, top + radius, radius, Math.PI, Math.PI / 2, (distance - accumulated) / cornerArc);
  }, [getCornerPoint]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const [displacement, borderOffset] = [chaos * 150, 60];

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      const width = rect.width + borderOffset * 2;
      const height = rect.height + borderOffset * 2;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
      return { width, height };
    };

    let { width: canvasW, height: canvasH } = updateSize();

    const drawElectricBorder = (currentTime: number) => {
      if (!lastFrameTimeRef.current) lastFrameTimeRef.current = currentTime;
      const deltaTime = (currentTime - lastFrameTimeRef.current) / 1000;
      timeRef.current += deltaTime * speed;
      lastFrameTimeRef.current = currentTime;

      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvasW, canvasH);
      
      const left = borderOffset;
      const top = borderOffset;
      const borderWidth = canvasW - 2 * borderOffset;
      const borderHeight = canvasH - 2 * borderOffset;
      const radius = Math.min(borderRadius, Math.min(borderWidth, borderHeight) / 2);
      
      // Aggressively optimized sample count
      const sampleCount = 400;

      const drawPath = (dispScale: number, opacity: number, blur: number, weight: number) => {
        ctx.save();
        ctx.strokeStyle = color;
        ctx.globalAlpha = opacity;
        ctx.lineWidth = weight;
        if (blur > 0) {
          ctx.shadowBlur = blur;
          ctx.shadowColor = color;
        }
        
        ctx.beginPath();
        for (let i = 0; i <= sampleCount; i++) {
          const progress = i / sampleCount;
          const point = getRoundedRectPoint(progress, left, top, borderWidth, borderHeight, radius);
          
          // Ultra-simplified noise
          const n1 = noise2D(progress * 10, timeRef.current * 1.5);
          const n2 = noise2D(progress * 10 + 100, timeRef.current * 1.5);
          
          const dx = n1 * displacement * dispScale * 0.5;
          const dy = n2 * displacement * dispScale * 0.5;

          if (i === 0) ctx.moveTo(point.x + dx, point.y + dy);
          else ctx.lineTo(point.x + dx, point.y + dy);
        }
        ctx.stroke();
        ctx.restore();
      };

      // Only two layers for performance
      drawPath(0.8, 0.4, 10, 1.5); // Glow layer
      drawPath(0.4, 1.0, 0, 1.0);  // Core filament

      animationRef.current = requestAnimationFrame(drawElectricBorder);
    };

    const resizeObserver = new ResizeObserver(() => {
      const newSize = updateSize();
      canvasW = newSize.width;
      canvasH = newSize.height;
    });
    
    resizeObserver.observe(container);
    animationRef.current = requestAnimationFrame(drawElectricBorder);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
    };
  }, [color, speed, chaos, borderRadius, octavedNoise, getRoundedRectPoint]);

  return (
    <div ref={containerRef} className={`electric-border ${className ?? ''}`} style={{ ...style, borderRadius }}>
      <div className="eb-canvas-container">
        <canvas ref={canvasRef} className="eb-canvas" />
      </div>
      <div className="eb-content">{children}</div>
    </div>
  );
};

export default ElectricBorder;
