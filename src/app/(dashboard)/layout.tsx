import type React from "react"
import { FloatingDock } from "@/components/layout/floating-dock"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-black">
      {/* Edge-to-edge canvas */}
      <main className="min-h-screen pb-28">{children}</main>

      {/* Floating macOS-style dock */}
      <FloatingDock />
    </div>
  )
}
