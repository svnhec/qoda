"use client"

import { useState } from "react"
import { mockAlerts } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertTriangle, TrendingUp, XCircle, Bell, Check, CheckCheck } from "lucide-react"
import { cn } from "@/lib/utils"

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)

  if (diffMins < 60) return `${diffMins} minutes ago`
  if (diffHours < 24) return `${diffHours} hours ago`
  return `${Math.floor(diffHours / 24)} days ago`
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(mockAlerts)
  const [activeTab, setActiveTab] = useState("all")

  const typeConfig = {
    decline: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10", label: "Decline" },
    anomaly: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10", label: "Anomaly" },
    limit_approaching: { icon: TrendingUp, color: "text-info", bg: "bg-info/10", label: "Limit Warning" },
    limit_reached: { icon: Bell, color: "text-warning", bg: "bg-warning/10", label: "Limit Reached" },
  }

  const unacknowledged = alerts.filter((a) => !a.acknowledged)
  const acknowledged = alerts.filter((a) => a.acknowledged)

  const filteredAlerts = activeTab === "all" ? alerts : activeTab === "unread" ? unacknowledged : acknowledged

  const acknowledgeAlert = (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a)))
  }

  const acknowledgeAll = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Alerts</h1>
          <p className="text-sm text-muted-foreground">Monitor and manage system alerts and notifications</p>
        </div>
        {unacknowledged.length > 0 && (
          <Button variant="outline" onClick={acknowledgeAll} className="gap-2 bg-transparent">
            <CheckCheck className="h-4 w-4" />
            Mark All as Read
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Alerts</p>
            <p className="text-2xl font-bold font-mono">{alerts.length}</p>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Declines</p>
            <p className="text-2xl font-bold font-mono text-destructive">
              {alerts.filter((a) => a.type === "decline").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Anomalies</p>
            <p className="text-2xl font-bold font-mono text-warning">
              {alerts.filter((a) => a.type === "anomaly").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Unread</p>
            <p className="text-2xl font-bold font-mono">{unacknowledged.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Alert Feed</CardTitle>
              <CardDescription>{filteredAlerts.length} alerts</CardDescription>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="unread" className="gap-1.5">
                  Unread
                  {unacknowledged.length > 0 && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      {unacknowledged.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="read">Read</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Bell className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="mt-4 text-sm font-medium">No alerts</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {activeTab === "unread" ? "All caught up!" : "No alerts to display"}
              </p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const config = typeConfig[alert.type]
              const Icon = config.icon

              return (
                <div
                  key={alert.id}
                  className={cn(
                    "group flex items-start gap-4 rounded-lg border p-4 transition-colors",
                    alert.acknowledged ? "border-border bg-transparent opacity-60" : "border-border bg-muted/30",
                  )}
                >
                  <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg", config.bg)}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={cn("text-xs", config.color)}>
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{formatTimeAgo(alert.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm">{alert.message}</p>
                    {alert.agentName && (
                      <div className="mt-2">
                        <Badge variant="outline" className="font-mono text-[10px]">
                          {alert.agentName}
                        </Badge>
                      </div>
                    )}
                  </div>
                  {!alert.acknowledged && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="shrink-0 gap-1.5 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Check className="h-4 w-4" />
                      Acknowledge
                    </Button>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
    </div>
  )
}
