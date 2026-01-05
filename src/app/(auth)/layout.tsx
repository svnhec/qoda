"use client"

import type React from "react"
import { motion } from "framer-motion"
import { useState, useEffect } from "react"

interface Particle {
    id: number
    x: number
    y: number
    targetY: number
    duration: number
    delay: number
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
    const [particles, setParticles] = useState<Particle[]>([])
    const [isClient, setIsClient] = useState(false)

    useEffect(() => {
        // Generate particles only on client side to avoid hydration mismatch
        const newParticles = Array.from({ length: 30 }).map((_, i) => ({
            id: i,
            x: Math.random() * window.innerWidth,
            y: Math.random() * window.innerHeight,
            targetY: Math.random() * -200 - 100,
            duration: Math.random() * 10 + 10,
            delay: Math.random() * 5,
        }))
        setParticles(newParticles)
        setIsClient(true)
    }, [])

    return (
        <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center">
            <div className="noise-overlay" />

            {/* Slow particle animation background - only render on client */}
            {isClient && (
                <div className="fixed inset-0 pointer-events-none z-0">
                    {particles.map((particle) => (
                        <motion.div
                            key={particle.id}
                            className="absolute w-1 h-1 rounded-full bg-primary/20"
                            initial={{
                                x: particle.x,
                                y: particle.y,
                            }}
                            animate={{
                                y: [null, particle.targetY],
                                opacity: [0, 1, 0],
                            }}
                            transition={{
                                duration: particle.duration,
                                repeat: Number.POSITIVE_INFINITY,
                                delay: particle.delay,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Radial gradient */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px]" />
            </div>

            {/* System Status Ticker */}
            <motion.div
                className="fixed bottom-6 right-6 flex items-center gap-2 text-xs text-muted-foreground z-10"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
            >
                <motion.span
                    className="w-2 h-2 rounded-full bg-primary"
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                />
                <span className="uppercase tracking-wider">System Status: Online</span>
            </motion.div>

            <div className="relative z-20 w-full">{children}</div>
        </div>
    )
}
