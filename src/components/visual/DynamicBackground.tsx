"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import type { Track } from "@/lib/types";
import { extractPaletteFromUrl, createDefaultPalette, generateCSSVariables } from "@/lib/visual/palette";
import type { ColorPalette } from "@/lib/visual/palette";

interface Props {
  track: Track | null;
  isPlaying: boolean;
  children: React.ReactNode;
  blur?: number;
}

export function DynamicBackground({ track, isPlaying, children, blur = 80 }: Props) {
  const [palette, setPalette] = useState<ColorPalette>(createDefaultPalette);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!track?.thumbnail) {
      setPalette(createDefaultPalette());
      return;
    }
    let active = true;
    extractPaletteFromUrl(track.thumbnail).then((p) => {
      if (active) setPalette(p);
    }).catch(() => {
      if (active) setPalette(createDefaultPalette());
    });
    return () => { active = false; };
  }, [track?.thumbnail]);

  const cssVars = useMemo(() => generateCSSVariables(palette), [palette]);

  const bgStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: -1,
    transition: "opacity 1.5s ease",
    opacity: track ? 1 : 0,
  };

  const gradientStyle: React.CSSProperties = {
    background: `linear-gradient(135deg, ${palette.primary.hex}22 0%, ${palette.secondary.hex}11 50%, transparent 100%)`,
    position: "absolute",
    inset: 0,
    transition: "background 1.5s ease",
  };

  const blobStyle: React.CSSProperties = track?.thumbnail
    ? {
        backgroundImage: `url(${track.thumbnail})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        filter: `blur(${blur}px) saturate(1.2)`,
        transform: "scale(1.1)",
        position: "absolute",
        inset: -100,
        opacity: 0.15,
        transition: "opacity 1.5s ease",
      }
    : { display: "none" };

  return (
    <>
      <div style={bgStyle}>
        {track?.thumbnail && <div style={blobStyle} />}
        <div style={gradientStyle} />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(circle at 30% 40%, ${palette.accent.hex}08 0%, transparent 60%)`,
          }}
        />
      </div>
      <div
        ref={containerRef}
        style={{ ...cssVars, position: "relative", zIndex: 1 } as React.CSSProperties}
      >
        {children}
      </div>
    </>
  );
}

export function DuotoneImage({
  src,
  accentColor,
  className,
}: {
  src: string;
  accentColor?: string;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!src) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const accent = accentColor || "#00FF66";
      const r = parseInt(accent.slice(1, 3), 16);
      const g = parseInt(accent.slice(3, 5), 16);
      const b = parseInt(accent.slice(5, 7), 16);

      for (let i = 0; i < data.length; i += 4) {
        const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        data[i] = gray * (r / 255);
        data[i + 1] = gray * (g / 255);
        data[i + 2] = gray * (b / 255);
      }

      ctx.putImageData(imageData, 0, 0);
      setLoaded(true);
    };
    img.src = src;
  }, [src, accentColor]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ opacity: loaded ? 1 : 0, transition: "opacity 0.5s ease" }}
    />
  );
}
