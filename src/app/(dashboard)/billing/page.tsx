"use client"

import { useState } from "react"
import { mockInvoices, mockClients } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import {
  Search,
  Plus,
  MoreHorizontal,
  FileText,
  Send,
  Download,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react"
import { cn } from "@/lib/utils"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount)
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function formatPeriod(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return `${startDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
}

export default function BillingPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)

  const filteredInvoices = mockInvoices.filter((invoice) =>
    invoice.clientName.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const statusConfig = {
    draft: { icon: FileText, color: "text-muted-foreground", bg: "bg-muted" },
    sent: { icon: Send, color: "text-info", bg: "bg-info/10" },
    paid: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
    overdue: { icon: AlertTriangle, color: "text-destructive", bg: "bg-destructive/10" },
  }

  const totalPending = mockInvoices
    .filter((i) => i.status === "sent" || i.status === "overdue")
    .reduce((sum, i) => sum + i.total, 0)
  const totalPaid = mockInvoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + i.total, 0)
  const totalDrafts = mockInvoices.filter((i) => i.status === "draft").length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Billing</h1>
          <p className="text-sm text-muted-foreground">Generate and manage client invoices</p>
        </div>
        <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Generate Invoices
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Generate Monthly Invoices</DialogTitle>
              <DialogDescription>
                Generate invoices for all active clients for the current billing period.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                <p className="text-sm font-medium">Preview</p>
                {mockClients
                  .filter((c) => c.status === "active")
                  .slice(0, 4)
                  .map((client) => (
                    <div key={client.id} className="flex items-center justify-between text-sm">
                      <span>{client.name}</span>
                      <span className="font-mono">
                        {formatCurrency(client.totalSpend * (1 + client.markupPercentage / 100))}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsGenerateDialogOpen(false)}>Generate All</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="text-2xl font-bold font-mono">{formatCurrency(totalPending)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
              <DollarSign className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Collected (MTD)</p>
              <p className="text-2xl font-bold font-mono text-success">{formatCurrency(totalPaid)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Drafts</p>
              <p className="text-2xl font-bold font-mono">{totalDrafts}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">All Invoices</CardTitle>
              <CardDescription>{filteredInvoices.length} invoices</CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search invoices..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Period</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Markup</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const config = statusConfig[invoice.status]
                const StatusIcon = config.icon

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm">{invoice.id.toUpperCase()}</TableCell>
                    <TableCell className="font-medium">{invoice.clientName}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatPeriod(invoice.periodStart, invoice.periodEnd)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatCurrency(invoice.subtotal)}</TableCell>
                    <TableCell className="text-right font-mono text-success">
                      +{formatCurrency(invoice.markupAmount)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">{formatCurrency(invoice.total)}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "gap-1.5",
                          invoice.status === "paid" && "border-success/30 text-success",
                          invoice.status === "sent" && "border-info/30 text-info",
                          invoice.status === "overdue" && "border-destructive/30 text-destructive",
                        )}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <FileText className="mr-2 h-4 w-4" />
                            View Invoice
                          </DropdownMenuItem>
                          {invoice.status === "draft" && (
                            <DropdownMenuItem>
                              <Send className="mr-2 h-4 w-4" />
                              Send Invoice
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </DropdownMenuItem>
                          {invoice.status === "sent" && (
                            <DropdownMenuItem>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark as Paid
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
