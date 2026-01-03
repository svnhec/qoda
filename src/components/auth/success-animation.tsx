/**
 * SUCCESS ANIMATION COMPONENT
 * =============================================================================
 * Lottie envelope flying animation for form submission success.
 *
 * Features:
 * - Lottie animation of flying envelope
 * - Triggered upon successful magic link send
 * - Smooth entrance animation
 * =============================================================================
 */

"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// Simple envelope flying animation using CSS/SVG
// This can be replaced with actual Lottie data when available
function EnvelopeAnimation() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="relative"
    >
      {/* Envelope SVG */}
      <svg
        width="80"
        height="60"
        viewBox="0 0 80 60"
        className="drop-shadow-lg"
      >
        {/* Envelope body */}
        <path
          d="M5 15 L40 30 L75 15 L75 55 L5 55 Z"
          fill="#10b981"
          stroke="#065f46"
          strokeWidth="2"
        />
        {/* Envelope flap */}
        <path
          d="M5 15 L40 30 L75 15 L40 5 Z"
          fill="#10b981"
          stroke="#065f46"
          strokeWidth="2"
        />
        {/* Lines inside envelope */}
        <line x1="15" y1="25" x2="35" y2="35" stroke="#065f46" strokeWidth="1" />
        <line x1="45" y1="35" x2="65" y2="25" stroke="#065f46" strokeWidth="1" />
        <line x1="15" y1="35" x2="35" y2="45" stroke="#065f46" strokeWidth="1" />
        <line x1="45" y1="45" x2="65" y2="35" stroke="#065f46" strokeWidth="1" />
      </svg>

      {/* Flying trail effect */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          opacity: [0, 0.5, 0]
        }}
        transition={{ duration: 2, repeat: Infinity }}
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.3) 0%, transparent 70%)'
        }}
      />
    </motion.div>
  );
}

interface SuccessAnimationProps {
  isVisible: boolean;
  onComplete?: () => void;
}

export function SuccessAnimation({ isVisible, onComplete }: SuccessAnimationProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Trigger confetti after envelope animation
      const timer = setTimeout(() => {
        setShowConfetti(true);
        onComplete?.();
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      setShowConfetti(false);
      return undefined;
    }
  }, [isVisible, onComplete]);

  if (!isVisible) return null;

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="text-center space-y-8">
        {/* Envelope Animation */}
        <EnvelopeAnimation />

        {/* Success Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-2"
        >
          <h2 className="text-2xl font-bold text-white">Magic link sent!</h2>
          <p className="text-white/70">
            Check your email for the login link
          </p>
        </motion.div>

        {/* Simple confetti effect */}
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 pointer-events-none"
          >
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                initial={{
                  x: Math.random() * window.innerWidth,
                  y: window.innerHeight + 100,
                  rotate: 0,
                  scale: 0
                }}
                animate={{
                  y: -100,
                  rotate: 360,
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 3,
                  delay: Math.random() * 0.5,
                  ease: "easeOut"
                }}
                className="absolute w-2 h-2 bg-gradient-to-r from-emerald-400 to-cyan-400 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                }}
              />
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
