import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface StatCardProps {
    title: string
    value: string | number
    subtitle?: string
    icon: LucideIcon
    trend?: {
        value: number
        isPositive: boolean
    }
    variant?: "default" | "success" | "warning" | "danger"
    className?: string
}

export function StatCard({
    title,
    value,
    subtitle,
    icon: Icon,
    trend,
    variant = "default",
    className,
}: StatCardProps) {
    const variantStyles = {
        default: "",
        success: "border-success/20",
        warning: "border-warning/20",
        danger: "border-destructive/20",
    }

    const iconStyles = {
        default: "text-muted-foreground",
        success: "text-success",
        warning: "text-warning",
        danger: "text-destructive",
    }

    return (
        <div
            className={cn(
                "glass-card p-5 relative overflow-hidden group",
                "hover:border-white/10 transition-all duration-300",
                variantStyles[variant],
                className
            )}
        >
            {/* Subtle glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            <div className="relative z-10">
                <div className="flex items-start justify-between">
                    <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                            {title}
                        </p>
                        <p className="text-3xl font-bold tracking-tight">{value}</p>
                        {subtitle && (
                            <p className="text-xs text-muted-foreground">{subtitle}</p>
                        )}
                        {trend && (
                            <p
                                className={cn(
                                    "text-xs",
                                    trend.isPositive ? "text-destructive" : "text-success"
                                )}
                            >
                                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                            </p>
                        )}
                    </div>
                    <Icon className={cn("h-5 w-5 opacity-50", iconStyles[variant])} />
                </div>
            </div>
        </div>
    )
}
