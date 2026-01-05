"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    Bot,
    Activity,
    FileText,
    Bell,
    CreditCard,
    Settings,
    Wallet,
} from "lucide-react"

const dockItems = [
    { icon: LayoutDashboard, label: "HUD", href: "/dashboard" },
    { icon: Users, label: "Clients", href: "/clients" },
    { icon: Bot, label: "Agents", href: "/agents" },
    { icon: CreditCard, label: "Cards", href: "/cards" },
    { icon: Activity, label: "Feed", href: "/transactions" },
    { icon: FileText, label: "Invoices", href: "/invoices" },
    { icon: Wallet, label: "Funding", href: "/funding" },
    { icon: Bell, label: "Alerts", href: "/alerts" },
    { icon: Settings, label: "Settings", href: "/settings" },
]

const dockVariants = {
    hidden: { opacity: 0, y: 100 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 20,
            staggerChildren: 0.05,
            delayChildren: 0.2,
        },
    },
}

const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.8 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            type: "spring",
            stiffness: 200,
            damping: 15,
        },
    },
}

export function FloatingDock() {
    const pathname = usePathname()

    return (
        <motion.div
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            initial="hidden"
            animate="visible"
            variants={dockVariants}
        >
            <nav className="floating-dock px-2 py-2 flex items-center gap-1">
                {dockItems.map((item) => {
                    const isActive =
                        pathname === item.href ||
                        (item.href !== "/" && pathname.startsWith(item.href))

                    return (
                        <motion.div key={item.href} variants={itemVariants}>
                            <Link
                                href={item.href}
                                className={cn(
                                    "dock-item flex flex-col items-center justify-center w-14 h-14 rounded-xl relative",
                                    "text-muted-foreground hover:text-foreground",
                                    isActive && "active text-primary"
                                )}
                            >
                                <motion.div
                                    whileHover={{ scale: 1.2, y: -4 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                                >
                                    <item.icon
                                        className={cn("w-5 h-5", isActive && "glow-text-green")}
                                    />
                                </motion.div>
                                <span className="text-[9px] mt-1 uppercase tracking-wider">
                                    {item.label}
                                </span>
                                {isActive && (
                                    <motion.div
                                        className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                                        layoutId="dock-indicator"
                                        transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                    />
                                )}
                            </Link>
                        </motion.div>
                    )
                })}
            </nav>
        </motion.div>
    )
}
