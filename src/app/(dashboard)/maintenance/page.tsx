"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Wrench, RefreshCw, Clock, ShieldCheck } from "lucide-react"

export default function MaintenancePage() {
  const [progress, setProgress] = useState(0)
  const [currentTask, setCurrentTask] = useState(0)
  const [dots, setDots] = useState("")

  const tasks = [
    { name: "Database migration", status: "complete" },
    { name: "Schema validation", status: "complete" },
    { name: "Index optimization", status: "in_progress" },
    { name: "Cache invalidation", status: "pending" },
    { name: "Service restart", status: "pending" },
  ]

  // Animated progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 67) return prev
        return prev + Math.random() * 2
      })
    }, 500)

    return () => clearInterval(interval)
  }, [])

  // Task progression
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTask((prev) => (prev < 2 ? prev : prev))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  // Loading dots animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background grid */}
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(16, 185, 129, 0.2) 1px, transparent 1px),
            linear-gradient(90deg, rgba(16, 185, 129, 0.2) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />

      {/* Pulsing circles */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full border border-emerald-500/20"
            initial={{ width: 100, height: 100, opacity: 0 }}
            animate={{
              width: [100, 600],
              height: [100, 600],
              opacity: [0.5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
              delay: i * 1.3,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Noise overlay */}
      <div className="noise-overlay" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 text-center space-y-8 max-w-lg"
      >
        {/* Icon */}
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
          className="mx-auto w-24 h-24 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center"
        >
          <Wrench className="h-12 w-12 text-emerald-500" />
        </motion.div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="text-3xl font-mono font-bold text-white">SYSTEM_UPDATE</h1>
          <p className="text-muted-foreground">Qoda is undergoing scheduled maintenance</p>
        </div>

        {/* Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm font-mono">
            <span className="text-muted-foreground">PROGRESS</span>
            <span className="text-emerald-400">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full"
              style={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Task List */}
        <div className="rounded-xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden text-left">
          <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
            <span className="font-mono text-xs text-muted-foreground">MAINTENANCE_TASKS</span>
            <RefreshCw className="h-4 w-4 text-emerald-500 animate-spin" />
          </div>
          <div className="p-4 space-y-3">
            {tasks.map((task, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span
                  className={
                    task.status === "complete"
                      ? "text-zinc-500"
                      : task.status === "in_progress"
                        ? "text-white"
                        : "text-zinc-600"
                  }
                >
                  {task.name}
                  {task.status === "in_progress" && dots}
                </span>
                <span
                  className={`font-mono text-xs ${
                    task.status === "complete"
                      ? "text-emerald-500"
                      : task.status === "in_progress"
                        ? "text-yellow-500"
                        : "text-zinc-600"
                  }`}
                >
                  {task.status === "complete" ? "[DONE]" : task.status === "in_progress" ? "[RUNNING]" : "[QUEUED]"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* ETA */}
        <div className="flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>Est. 15 minutes remaining</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-500">
            <ShieldCheck className="h-4 w-4" />
            <span>Data protected</span>
          </div>
        </div>

        {/* Status message */}
        <p className="text-xs text-muted-foreground font-mono">
          STATUS: Optimizing database indices for improved query performance.
          <br />
          Your data is safe and will be available shortly.
        </p>
      </motion.div>
    </div>
  )
}
