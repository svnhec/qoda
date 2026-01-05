"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { mockAgents } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Search, Plus, MoreHorizontal, Bot, CreditCard, Pause, Play, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function AgentsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const router = useRouter()

  const filteredAgents = mockAgents.filter(
    (agent) =>
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.clientName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Agents</h1>
          <p className="text-sm text-muted-foreground">Manage your AI agents and their virtual cards</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Issue New Card
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Issue Virtual Card</DialogTitle>
              <DialogDescription>Create a new virtual card for an AI agent.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="client">Client</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cl_1">TechCorp Industries</SelectItem>
                    <SelectItem value="cl_2">Nexus Ventures</SelectItem>
                    <SelectItem value="cl_3">Quantum Dynamics</SelectItem>
                    <SelectItem value="cl_4">Stellar Systems</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agent-name">Agent Name</Label>
                <Input id="agent-name" placeholder="Lead Gen Bot v2" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of what this agent does..."
                  className="resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="daily-limit">Daily Limit ($)</Label>
                  <Input id="daily-limit" type="number" defaultValue="500" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="monthly-limit">Monthly Limit ($)</Label>
                  <Input id="monthly-limit" type="number" defaultValue="2000" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddDialogOpen(false)}>Issue Card</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative w-full sm:w-64">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search agents..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Agent Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filteredAgents.map((agent) => {
          const dailyPercent = (agent.currentDailySpend / agent.dailyLimit) * 100
          const monthlyPercent = (agent.currentMonthlySpend / agent.monthlyLimit) * 100

          return (
            <Card
              key={agent.id}
              className="relative overflow-hidden cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => router.push(`/agents/${agent.id}`)}
            >
              {/* Status indicator */}
              <div
                className={cn(
                  "absolute left-0 top-0 h-full w-1",
                  agent.status === "active" && "bg-success",
                  agent.status === "paused" && "bg-warning",
                  agent.status === "cancelled" && "bg-destructive",
                )}
              />

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg",
                        agent.status === "active" && "bg-success/10",
                        agent.status === "paused" && "bg-warning/10",
                        agent.status === "cancelled" && "bg-destructive/10",
                      )}
                    >
                      <Bot
                        className={cn(
                          "h-5 w-5",
                          agent.status === "active" && "text-success",
                          agent.status === "paused" && "text-warning",
                          agent.status === "cancelled" && "text-destructive",
                        )}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-base">{agent.name}</CardTitle>
                      <CardDescription className="text-xs">{agent.clientName}</CardDescription>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <CreditCard className="mr-2 h-4 w-4" />
                        View Card Details
                      </DropdownMenuItem>
                      {agent.status === "active" ? (
                        <DropdownMenuItem>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause Card
                        </DropdownMenuItem>
                      ) : agent.status === "paused" ? (
                        <DropdownMenuItem>
                          <Play className="mr-2 h-4 w-4" />
                          Resume Card
                        </DropdownMenuItem>
                      ) : null}
                      <DropdownMenuItem>Edit Limits</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Cancel Card
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-2">{agent.description}</p>

                {/* Card Info */}
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-sm">•••• {agent.cardLastFour}</span>
                  </div>
                  <Badge
                    variant={agent.status === "active" ? "default" : "secondary"}
                    className={cn(
                      "text-xs",
                      agent.status === "active" && "bg-success/10 text-success hover:bg-success/20",
                      agent.status === "paused" && "bg-warning/10 text-warning hover:bg-warning/20",
                    )}
                  >
                    {agent.status}
                  </Badge>
                </div>

                {/* Spend Limits */}
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Daily Limit</span>
                      <span className="font-mono">
                        {formatCurrency(agent.currentDailySpend)} / {formatCurrency(agent.dailyLimit)}
                      </span>
                    </div>
                    <Progress
                      value={dailyPercent}
                      className={cn(
                        "h-1.5",
                        dailyPercent > 80 && "[&>div]:bg-warning",
                        dailyPercent > 95 && "[&>div]:bg-destructive",
                      )}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Monthly Limit</span>
                      <span className="font-mono">
                        {formatCurrency(agent.currentMonthlySpend)} / {formatCurrency(agent.monthlyLimit)}
                      </span>
                    </div>
                    <Progress
                      value={monthlyPercent}
                      className={cn(
                        "h-1.5",
                        monthlyPercent > 80 && "[&>div]:bg-warning",
                        monthlyPercent > 95 && "[&>div]:bg-destructive",
                      )}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
