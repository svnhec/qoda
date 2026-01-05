/**
 * AUTH VISUALIZATION COMPONENT
 * =============================================================================
 * Immersive 3D visualization for the right pane of authentication pages.
 *
 * Features:
 * - Abstract geometric shapes with animations
 * - Cyber-Industrial aesthetic
 * - Placeholder for Three.js integration
 * =============================================================================
 */

"use client";

import { useEffect, useState } from "react";

export function AuthVisualization() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#1a1a1a]" />;
  }

  return (
    <div className="relative w-full h-full bg-gradient-to-br from-[#0a0a0a] via-[#111111] to-[#1a1a1a] overflow-hidden">
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            animation: 'gridShift 25s ease-in-out infinite'
          }}
        />
      </div>

      {/* Floating Geometric Elements */}
      <div className="absolute inset-0">
        {/* Large central shape */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <div className="w-40 h-40 rounded-3xl bg-gradient-to-br from-cyan-400/10 to-purple-500/10 backdrop-blur-sm border border-white/10 flex items-center justify-center animate-pulse">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 flex items-center justify-center">
                <span className="text-white font-bold text-3xl">Q</span>
              </div>
            </div>

            {/* Orbiting elements */}
            <div className="absolute inset-0 animate-spin" style={{ animationDuration: '20s' }}>
              <div className="absolute -top-3 left-1/2 w-3 h-3 bg-cyan-400 rounded-full transform -translate-x-1/2 shadow-lg shadow-cyan-400/50" />
              <div className="absolute top-1/2 -right-3 w-3 h-3 bg-purple-400 rounded-full transform -translate-y-1/2 shadow-lg shadow-purple-400/50" />
              <div className="absolute -bottom-3 left-1/2 w-3 h-3 bg-emerald-400 rounded-full transform -translate-x-1/2 shadow-lg shadow-emerald-400/50" />
              <div className="absolute top-1/2 -left-3 w-3 h-3 bg-amber-400 rounded-full transform -translate-y-1/2 shadow-lg shadow-amber-400/50" />
            </div>
          </div>
        </div>

        {/* Additional floating elements */}
        <div className="absolute top-1/4 left-1/4 w-24 h-24 border border-cyan-400/30 rounded-full animate-bounce" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/3 right-1/4 w-16 h-16 border border-purple-400/30 rotate-45 animate-pulse" />
        <div className="absolute bottom-1/3 left-1/3 w-32 h-32 border border-emerald-400/20 rounded-lg animate-spin" style={{ animationDuration: '15s' }} />
        <div className="absolute bottom-1/4 right-1/3 w-20 h-20 border border-amber-400/30 rotate-12 animate-ping" style={{ animationDuration: '3s' }} />

        {/* Flowing data streams */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden">
          <div className="absolute top-16 left-16 w-px h-40 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent animate-pulse" />
          <div className="absolute top-24 right-24 w-px h-32 bg-gradient-to-b from-transparent via-purple-400/40 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute bottom-32 left-1/4 w-px h-48 bg-gradient-to-b from-transparent via-emerald-400/40 to-transparent animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
      </div>

      {/* Subtle brand text overlay */}
      <div className="absolute bottom-12 right-12 text-right">
        <div className="text-sm text-white/20 font-light tracking-wide">
          Financial Observability Platform
        </div>
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        @keyframes gridShift {
          0%, 100% {
            background-position: 0 0;
          }
          50% {
            background-position: 30px 30px;
          }
        }
      `}</style>
    </div>
  );
}


