/**
 * SPOTLIGHT CARD COMPONENT
 * =============================================================================
 * Wrapper component with cursor spotlight and 3D tilt effects
 *
 * Features:
 * - Radial gradient spotlight that follows cursor
 * - 3D tilt effect on hover using transform3d
 * - Smooth transitions and animations
 * =============================================================================
 */

"use client";

import { useRef, useState, ReactNode } from "react";
import { motion } from "framer-motion";

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
  spotlightColor?: string;
  tiltIntensity?: number;
}

export function SpotlightCard({
  children,
  className = "",
  spotlightColor = "rgba(16, 185, 129, 0.1)", // Emerald spotlight
  tiltIntensity = 15
}: SpotlightCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setMousePosition({ x, y });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => setIsHovered(false);

  // Calculate tilt rotation based on mouse position
  const centerX = mousePosition.x;
  const centerY = mousePosition.y;
  const rotateX = isHovered ? (centerY / 100 - 0.5) * tiltIntensity : 0;
  const rotateY = isHovered ? (centerX / 100 - 0.5) * -tiltIntensity : 0;

  return (
    <motion.div
      ref={cardRef}
      className={`relative overflow-hidden rounded-xl border border-white/10 bg-[#09090b] transition-all duration-300 ${className}`}
      style={{
        transformStyle: "preserve-3d",
        transform: `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`,
      }}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)"
      }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Spotlight gradient */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          background: `radial-gradient(circle 150px at ${mousePosition.x}px ${mousePosition.y}px, ${spotlightColor}, transparent 70%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Card border reveal effect */}
      <div
        className="absolute inset-0 pointer-events-none transition-all duration-500 rounded-xl"
        style={{
          background: `linear-gradient(135deg,
            transparent 0%,
            rgba(255, 255, 255, 0.1) 50%,
            transparent 100%)`,
          maskImage: isHovered
            ? `radial-gradient(circle 100px at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)`
            : 'none',
          WebkitMaskImage: isHovered
            ? `radial-gradient(circle 100px at ${mousePosition.x}px ${mousePosition.y}px, black 0%, transparent 100%)`
            : 'none',
        }}
      />

      {/* Card content */}
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  );
}


