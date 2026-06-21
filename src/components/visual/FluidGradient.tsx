"use client";

import { useEffect, useRef } from "react";
import type { ColorPalette } from "@/lib/visual/palette";

interface Props {
  palette: ColorPalette;
  isPlaying: boolean;
  tempo?: number;
  className?: string;
}

export function FluidGradient({ palette, isPlaying, tempo = 120, className = "" }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const beatInterval = 60 / Math.max(tempo, 40);
    const speed = isPlaying ? 1 : 0.15;

    const draw = (t: number) => {
      timeRef.current += 0.005 * speed;
      const tt = timeRef.current;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const maxR = Math.max(canvas.width, canvas.height) * 1.2;

      const p1 = palette.primary;
      const p2 = palette.secondary;
      const p3 = palette.tertiary;
      const accent = palette.accent;

      const phases = [
        { x: cx + Math.sin(tt * 0.7) * cx * 0.5, y: cy + Math.cos(tt * 0.5) * cy * 0.5, color: p1.hex, weight: 0.4 },
        { x: cx + Math.cos(tt * 0.4) * cx * 0.4, y: cy + Math.sin(tt * 0.6) * cy * 0.4, color: p2.hex, weight: 0.3 },
        { x: cx + Math.sin(tt * 0.3 + 1) * cx * 0.3, y: cy + Math.cos(tt * 0.7 + 1) * cy * 0.3, color: p3.hex, weight: 0.2 },
        { x: cx + Math.cos(tt * 0.5 + 2) * cx * 0.35, y: cy + Math.sin(tt * 0.4 + 2) * cy * 0.35, color: accent.hex, weight: 0.1 },
      ];

      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      let totalW = phases.reduce((s, p) => s + p.weight, 0);

      let accumulated = 0;
      for (const phase of phases) {
        const offset = accumulated / totalW;
        const ratio = phase.weight / totalW;

        const g = ctx.createRadialGradient(phase.x, phase.y, 0, phase.x, phase.y, maxR * 0.7);
        g.addColorStop(0, phase.color + "66");
        g.addColorStop(0.5, phase.color + "22");
        g.addColorStop(1, "transparent");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        accumulated += phase.weight;
      }

      const overlay = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
      overlay.addColorStop(0, "transparent");
      overlay.addColorStop(0.6, "transparent");
      overlay.addColorStop(1, "#0F0F13");
      ctx.fillStyle = overlay;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [palette, isPlaying, tempo]);

  return (
    <canvas
      ref={canvasRef}
      className={`pointer-events-none fixed inset-0 -z-10 ${className}`}
    />
  );
}
