"use client";

/**
 * Cursor Spotlight
 * =============================================================================
 * Radial gradient that follows the user's mouse cursor.
 * Creates "flashlight" discovery effect.
 * =============================================================================
 */

import { useEffect, useState, useRef } from "react";

interface Props {
    children: React.ReactNode;
    className?: string;
}

export default function CursorSpotlight({ children, className = "" }: Props) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            setPosition({
                x: e.clientX - rect.left,
                y: e.clientY - rect.top,
            });
        };

        const handleMouseEnter = () => setIsVisible(true);
        const handleMouseLeave = () => setIsVisible(false);

        container.addEventListener("mousemove", handleMouseMove);
        container.addEventListener("mouseenter", handleMouseEnter);
        container.addEventListener("mouseleave", handleMouseLeave);

        return () => {
            container.removeEventListener("mousemove", handleMouseMove);
            container.removeEventListener("mouseenter", handleMouseEnter);
            container.removeEventListener("mouseleave", handleMouseLeave);
        };
    }, []);

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* Spotlight */}
            <div
                className="pointer-events-none absolute w-[600px] h-[600px] rounded-full transition-opacity duration-300"
                style={{
                    left: position.x,
                    top: position.y,
                    transform: "translate(-50%, -50%)",
                    background: "radial-gradient(circle at center, rgba(139, 92, 246, 0.08) 0%, transparent 70%)",
                    opacity: isVisible ? 1 : 0,
                }}
            />
            {children}
        </div>
    );
}
