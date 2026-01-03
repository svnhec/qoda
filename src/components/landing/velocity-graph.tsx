/**
 * VELOCITY GRAPH COMPONENT
 * =============================================================================
 * WebGL-powered sparkline spanning full viewport width
 *
 * Features:
 * - Glowing, animated sine wave using react-three-fiber
 * - Spans full width of container (ignores fold)
 * - Looks like a live oscilloscope
 * - GPU-accelerated for smooth 60fps animation
 * =============================================================================
 */

"use client";

import { useEffect, useState } from "react";

// Simple animated sine wave using SVG for better compatibility
function AnimatedWave() {
  const [wavePath, setWavePath] = useState("");

  useEffect(() => {
    const animate = () => {
      const time = Date.now() * 0.001; // Convert to seconds
      const width = 800;
      const height = 100;
      const amplitude = 20;

      let path = `M 0 ${height / 2}`;

      for (let x = 0; x <= width; x += 5) {
        // Create multiple sine waves with different frequencies
        const y1 = Math.sin((x * 0.02) + time * 2) * amplitude;
        const y2 = Math.sin((x * 0.04) + time * 3) * amplitude * 0.5;
        const y3 = Math.sin((x * 0.03) + time * 1.5) * amplitude * 0.3;

        const y = height / 2 + y1 + y2 + y3;
        path += ` L ${x} ${y}`;
      }

      setWavePath(path);
      requestAnimationFrame(animate);
    };

    animate();
  }, []);

  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 800 100"
      className="overflow-visible"
    >
      {/* Glow effect */}
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      {/* Animated wave path */}
      <path
        d={wavePath}
        stroke="#10b981"
        strokeWidth="2"
        fill="none"
        filter="url(#glow)"
        className="drop-shadow-lg"
      />

      {/* Grid lines for oscilloscope effect */}
      <defs>
        <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
  );
}

export function VelocityGraph() {
  return (
    <div className="w-full h-32 relative overflow-hidden bg-[#050505]">
      {/* Glow effect background */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent" />

      {/* Animated wave */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AnimatedWave />
      </div>

      {/* Overlay text */}
      <div className="absolute bottom-2 right-4 text-xs text-white/40 font-mono">
        Live spend velocity
      </div>
    </div>
  );
}