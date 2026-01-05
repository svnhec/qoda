"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { mockAlerts } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { AlertTriangle, TrendingUp, XCircle, Bell, Check } from "lucide-react"

function formatTimeAgo(dateString: string) {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${Math.floor(diffHours / 24)}d ago`
}

export function AlertsPanel() {
    const unacknowledged = mockAlerts.filter((a) => !a.acknowledged)

    const typeConfig = {
        decline: {
            icon: XCircle,
            color: "text-destructive",
            bg: "bg-destructive/10",
        },
        anomaly: {
            icon: AlertTriangle,
            color: "text-warning",
            bg: "bg-warning/10",
        },
        limit_approaching: {
            icon: TrendingUp,
            color: "text-info",
            bg: "bg-info/10",
        },
        limit_reached: { icon: Bell, color: "text-warning", bg: "bg-warning/10" },
    }

    return (
        <Card>
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Alerts</CardTitle>
                    {unacknowledged.length > 0 && (
                        <Badge variant="destructive" className="text-[10px]">
                            {unacknowledged.length} new
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {mockAlerts.slice(0, 4).map((alert) => {
                    const config = typeConfig[alert.type]
                    const Icon = config.icon

                    return (
                        <div
                            key={alert.id}
                            className={cn(
                                "group flex items-start gap-3 rounded-lg border p-3 transition-colors",
                                alert.acknowledged
                                    ? "border-border bg-transparent opacity-60"
                                    : "border-border bg-muted/30"
                            )}
                        >
                            <div
                                className={cn(
                                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                                    config.bg
                                )}
                            >
                                <Icon className={cn("h-4 w-4", config.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm leading-snug">{alert.message}</p>
                                <div className="mt-1 flex items-center gap-2">
                                    {alert.agentName && (
                                        <Badge variant="outline" className="text-[10px] font-mono">
                                            {alert.agentName}
                                        </Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">
                                        {formatTimeAgo(alert.createdAt)}
                                    </span>
                                </div>
                            </div>
                            {!alert.acknowledged && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                    <Check className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                    )
                })}
            </CardContent>
        </Card>
    )
}
