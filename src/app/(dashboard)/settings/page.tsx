"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  CreditCard,
  Bell,
  Shield,
  ExternalLink,
  Check,
  Zap,
  AlertTriangle,
  Key,
  Monitor,
  Download,
  Trash2,
} from "lucide-react"

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 15,
    },
  },
}

export default function SettingsPage() {
  const [saving, setSaving] = useState(false)

  const handleSave = () => {
    setSaving(true)
    setTimeout(() => setSaving(false), 1500)
  }

  return (
    <div className="min-h-screen p-6 pb-32">
      <motion.div
        className="max-w-6xl mx-auto space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h1 className="text-4xl font-mono font-bold tracking-tight mb-2">
            SYSTEM <span className="glow-text-green">CONFIG</span>
          </h1>
          <p className="text-muted-foreground font-mono text-sm">// CONTROL PANEL v2.0</p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Organization */}
            <motion.div variants={itemVariants} className="glass-card rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center glow-green">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-mono font-bold">ORGANIZATION</h2>
                  <p className="text-xs text-muted-foreground font-mono">// Agency Configuration</p>
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs font-mono text-muted-foreground">ORG_NAME</Label>
                  <Input
                    defaultValue="Acme AI Agency"
                    className="glass-card border-white/10 font-mono bg-transparent focus:border-primary/50"
                  />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs font-mono text-muted-foreground">BILLING_EMAIL</Label>
                  <Input
                    type="email"
                    defaultValue="billing@acme-ai.agency"
                    className="glass-card border-white/10 font-mono bg-transparent focus:border-primary/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label className="text-xs font-mono text-muted-foreground">DEFAULT_MARKUP_%</Label>
                    <Input
                      type="number"
                      defaultValue="20"
                      className="glass-card border-white/10 font-mono bg-transparent focus:border-primary/50"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label className="text-xs font-mono text-muted-foreground">CURRENCY</Label>
                    <Select defaultValue="usd">
                      <SelectTrigger className="glass-card border-white/10 font-mono bg-transparent">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-white/10 bg-black/90">
                        <SelectItem value="usd" className="font-mono">
                          USD ($)
                        </SelectItem>
                        <SelectItem value="eur" className="font-mono">
                          EUR (€)
                        </SelectItem>
                        <SelectItem value="gbp" className="font-mono">
                          GBP (£)
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleSave}
                className="w-full bg-primary/20 border border-primary/50 hover:bg-primary/30 font-mono gap-2"
              >
                {saving ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                    >
                      <Zap className="h-4 w-4" />
                    </motion.div>
                    SAVING...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    SAVE CHANGES
                  </>
                )}
              </Button>
            </motion.div>

            {/* Stripe Integration */}
            <motion.div variants={itemVariants} className="glass-card rounded-xl p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-lg bg-[#635bff]/20 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-[#635bff]" />
                  </div>
                  <div>
                    <h2 className="text-lg font-mono font-bold">STRIPE ISSUING</h2>
                    <p className="text-xs text-muted-foreground font-mono">// Payment Infrastructure</p>
                  </div>
                </div>
                <Badge className="bg-primary/20 text-primary border border-primary/30 font-mono text-xs px-3 py-1 glow-green">
                  CONNECTED
                </Badge>
              </div>

              <Separator className="bg-white/5" />

              <div className="rounded-lg border border-white/5 bg-black/30 p-4 space-y-3 font-mono text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ACCOUNT_ID</span>
                  <span className="text-primary">acct_1234567890</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">ISSUING_BALANCE</span>
                  <span className="glow-text-green text-xl">$12,450.00</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">KYB_STATUS</span>
                  <Badge className="bg-primary/20 text-primary border-primary/30 font-mono text-xs">VERIFIED</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">CARDS_ACTIVE</span>
                  <span>12</span>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 glass-card border-white/10 hover:border-white/20 font-mono gap-2 bg-transparent"
                >
                  <ExternalLink className="h-4 w-4" />
                  STRIPE DASHBOARD
                </Button>
                <Button className="flex-1 bg-[#635bff]/20 border border-[#635bff]/50 hover:bg-[#635bff]/30 font-mono">
                  ADD FUNDS
                </Button>
              </div>
            </motion.div>

            {/* Notifications */}
            <motion.div variants={itemVariants} className="glass-card rounded-xl p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-yellow-500" />
                </div>
                <div>
                  <h2 className="text-lg font-mono font-bold">ALERT CONFIG</h2>
                  <p className="text-xs text-muted-foreground font-mono">// Notification Settings</p>
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="space-y-4">
                {[
                  {
                    title: "CARD_DECLINES",
                    desc: "Alert on transaction decline events",
                    defaultChecked: true,
                  },
                  {
                    title: "LIMIT_WARNINGS",
                    desc: "Alert when agents approach spend limits",
                    defaultChecked: true,
                  },
                  {
                    title: "ANOMALY_DETECT",
                    desc: "AI-powered unusual pattern detection",
                    defaultChecked: true,
                  },
                  {
                    title: "DAILY_DIGEST",
                    desc: "Daily spend summary via email",
                    defaultChecked: false,
                  },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between py-2">
                      <div className="space-y-1">
                        <Label className="font-mono text-sm">{item.title}</Label>
                        <p className="text-xs text-muted-foreground font-mono">// {item.desc}</p>
                      </div>
                      <Switch defaultChecked={item.defaultChecked} />
                    </div>
                    {i < 3 && <Separator className="bg-white/5" />}
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Security */}
            <motion.div variants={itemVariants} className="glass-card rounded-xl p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/20 flex items-center justify-center glow-green">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-mono font-bold">SECURITY</h2>
                </div>
              </div>

              <Separator className="bg-white/5" />

              <div className="space-y-2">
                {[
                  { icon: Key, label: "CHANGE_PASSWORD" },
                  { icon: Shield, label: "2FA_CONFIG" },
                  { icon: Key, label: "API_KEYS" },
                  { icon: Monitor, label: "ACTIVE_SESSIONS" },
                ].map((item, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    className="w-full justify-start font-mono text-xs gap-3 hover:bg-white/5 h-10"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </Button>
                ))}
              </div>
            </motion.div>

            {/* System Info */}
            <motion.div variants={itemVariants} className="glass-card rounded-xl p-6 space-y-4">
              <h2 className="text-lg font-mono font-bold">SYSTEM INFO</h2>
              <Separator className="bg-white/5" />
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">VERSION</span>
                  <span className="text-primary">v2.4.1</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">API_STATUS</span>
                  <span className="glow-text-green">ONLINE</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">UPTIME</span>
                  <span>99.99%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">LATENCY</span>
                  <span>12ms</span>
                </div>
              </div>
            </motion.div>

            {/* Danger Zone */}
            <motion.div variants={itemVariants} className="glass-card rounded-xl p-6 space-y-4 border-red-500/20">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-mono font-bold glow-text-red">DANGER ZONE</h2>
                </div>
              </div>

              <Separator className="bg-red-500/20" />

              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start font-mono text-xs gap-3 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 h-10"
                >
                  <Download className="h-4 w-4" />
                  EXPORT_ALL_DATA
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start font-mono text-xs gap-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 h-10"
                >
                  <Trash2 className="h-4 w-4" />
                  DELETE_ORGANIZATION
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
