"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { mockTransactions, type Transaction } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, Download, CheckCircle2, XCircle, Clock, RefreshCw } from "lucide-react"
import { cn } from "@/lib/utils"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString)
  return {
    date: date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    time: date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  }
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState(mockTransactions)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isLive, setIsLive] = useState(true)
  const router = useRouter()

  // Simulate live transactions
  useEffect(() => {
    if (!isLive) return

    const merchants = ["OpenAI", "Anthropic", "AWS", "Google Cloud", "Azure", "Pinecone", "Vercel", "Replicate"]
    const agents = [
      "Lead Gen Bot v2",
      "Support Agent Alpha",
      "Content Creator Pro",
      "Data Processor X1",
      "Research Assistant",
    ]
    const clients = ["TechCorp Industries", "Nexus Ventures", "Quantum Dynamics", "Stellar Systems"]

    const interval = setInterval(() => {
      const newTx: Transaction = {
        id: `tx_${Date.now()}`,
        agentId: "ag_1",
        agentName: agents[Math.floor(Math.random() * agents.length)],
        clientId: "cl_1",
        clientName: clients[Math.floor(Math.random() * clients.length)],
        amount: Math.round((Math.random() * 150 + 5) * 100) / 100,
        currency: "USD",
        merchantName: merchants[Math.floor(Math.random() * merchants.length)],
        merchantMcc: "7372",
        status: Math.random() > 0.08 ? "approved" : "declined",
        declineReason: Math.random() > 0.5 ? "Daily limit exceeded" : "Insufficient balance",
        createdAt: new Date().toISOString(),
      }

      setTransactions((prev) => [newTx, ...prev.slice(0, 49)])
    }, 4000)

    return () => clearInterval(interval)
  }, [isLive])

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.clientName.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === "all" || tx.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const statusConfig = {
    approved: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    declined: { icon: XCircle, color: "text-destructive", bg: "bg-destructive/10" },
    pending: { icon: Clock, color: "text-warning", bg: "bg-warning/10" },
  }

  const totalApproved = transactions.filter((t) => t.status === "approved").reduce((sum, t) => sum + t.amount, 0)
  const totalDeclined = transactions.filter((t) => t.status === "declined").length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
            {isLive && (
              <span className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success"></span>
                </span>
                Live
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Real-time transaction monitoring and history</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isLive ? "default" : "outline"}
            size="sm"
            onClick={() => setIsLive(!isLive)}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", isLive && "animate-spin")} />
            {isLive ? "Pause" : "Resume"}
          </Button>
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total Approved</p>
            <p className="text-2xl font-bold font-mono text-success">{formatCurrency(totalApproved)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Transaction Count</p>
            <p className="text-2xl font-bold font-mono">{transactions.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Declined</p>
            <p className="text-2xl font-bold font-mono text-destructive">{totalDeclined}</p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Transaction Feed</CardTitle>
              <CardDescription>{filteredTransactions.length} transactions</CardDescription>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-32">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="declined">Declined</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Merchant</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Client</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Timestamp</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((tx) => {
                const config = statusConfig[tx.status]
                const StatusIcon = config.icon
                const { date, time } = formatDateTime(tx.createdAt)

                return (
                  <TableRow
                    key={tx.id}
                    className="cursor-pointer hover:bg-white/5"
                    onClick={() => router.push(`/transactions/${tx.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg", config.bg)}>
                          <StatusIcon className={cn("h-4 w-4", config.color)} />
                        </div>
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            tx.status === "approved" && "border-success/30 text-success",
                            tx.status === "declined" && "border-destructive/30 text-destructive",
                          )}
                        >
                          {tx.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{tx.merchantName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[10px]">
                        {tx.agentName}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{tx.clientName}</TableCell>
                    <TableCell
                      className={cn("text-right font-mono font-medium", tx.status === "declined" && "text-destructive")}
                    >
                      {tx.status === "declined" ? "-" : ""}
                      {formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-xs">{date}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">{time}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
