"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { mockClients } from "@/lib/mock-data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { motion } from "framer-motion"
import {
  ArrowLeft,
  Bot,
  Building2,
  CreditCard,
  DollarSign,
  CheckCircle2,
  Loader2,
  Zap,
  ShieldCheck,
} from "lucide-react"

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount)
}

export default function NewAgentPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [generatedCard, setGeneratedCard] = useState({
    number: "4242 4242 4242",
    last4: "0000",
    expiry: "12/28",
    cvc: "•••",
  })

  const [formData, setFormData] = useState({
    clientId: "",
    name: "",
    description: "",
    dailyLimit: 500,
    monthlyLimit: 5000,
  })

  const selectedClient = mockClients.find((c) => c.id === formData.clientId)

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Simulate API call with card generation
    await new Promise((resolve) => setTimeout(resolve, 2500))
    setGeneratedCard({
      number: "4242 4242 4242",
      last4: String(Math.floor(1000 + Math.random() * 9000)),
      expiry: "01/28",
      cvc: String(Math.floor(100 + Math.random() * 900)),
    })
    setIsSubmitting(false)
    setIsComplete(true)
  }

  const isValid = formData.clientId && formData.name.length > 0 && formData.dailyLimit > 0

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  }

  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-8 max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" as const, stiffness: 200 }}
            className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center"
          >
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </motion.div>

          <div>
            <h1 className="text-2xl font-bold text-white mb-2 font-mono">CARD_ISSUED</h1>
            <p className="text-muted-foreground">
              Virtual card for <span className="text-white">{formData.name}</span> is now active
            </p>
          </div>

          {/* Generated Card Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="relative w-80 h-48 rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 p-6 mx-auto shadow-2xl glow"
          >
            <div className="flex justify-between items-start">
              <div className="h-10 w-12 rounded bg-gradient-to-br from-amber-200 to-amber-400 opacity-90" />
              <span className="text-white/90 font-mono text-sm font-bold">QODA</span>
            </div>
            <div className="absolute bottom-6 left-6 right-6">
              <p className="font-mono text-lg text-white mb-2 tracking-widest">
                {generatedCard.number} {generatedCard.last4}
              </p>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] text-white/60 mb-0.5">AGENT</p>
                  <p className="font-mono text-sm text-white truncate max-w-[180px]">{formData.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-white/60 mb-0.5">VALID THRU</p>
                  <p className="font-mono text-sm text-white">{generatedCard.expiry}</p>
                </div>
              </div>
            </div>
            {/* Shine effect */}
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-white/0 via-white/10 to-white/0 pointer-events-none" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl bg-zinc-900/50 border border-white/10 p-4 font-mono text-sm"
          >
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-muted-foreground text-xs mb-1">DAILY_LIMIT</p>
                <p className="text-emerald-400">{formatCurrency(formData.dailyLimit)}</p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs mb-1">MONTHLY_LIMIT</p>
                <p className="text-emerald-400">{formatCurrency(formData.monthlyLimit)}</p>
              </div>
            </div>
          </motion.div>

          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={() => router.push("/agents")} className="bg-transparent border-white/10">
              View All Agents
            </Button>
            <Button
              onClick={() => {
                setIsComplete(false)
                setFormData({
                  clientId: formData.clientId,
                  name: "",
                  description: "",
                  dailyLimit: 500,
                  monthlyLimit: 5000,
                })
              }}
              className="bg-emerald-500 hover:bg-emerald-600 text-black"
            >
              Issue Another Card
            </Button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 pb-32">
      <motion.div
        className="mx-auto max-w-2xl space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Back Button */}
        <motion.div variants={itemVariants}>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Agents
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div variants={itemVariants} className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-mono tracking-tight text-white">ISSUE_VIRTUAL_CARD</h1>
          <p className="text-muted-foreground">Deploy a new virtual card for an AI agent</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden"
        >
          <div className="p-6 space-y-6">
            {/* Client Select */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Building2 className="h-4 w-4" />
                SELECT_CLIENT
              </Label>
              <Select
                value={formData.clientId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, clientId: value }))}
              >
                <SelectTrigger className="h-12 bg-zinc-900/50 border-white/10 font-mono">
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  {mockClients
                    .filter((c) => c.status === "active")
                    .map((client) => (
                      <SelectItem key={client.id} value={client.id} className="font-mono">
                        {client.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {selectedClient && (
                <p className="text-xs text-muted-foreground font-mono">
                  MARKUP: {selectedClient.markupPercentage}% · AGENTS: {selectedClient.agentCount}
                </p>
              )}
            </div>

            {/* Agent Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Bot className="h-4 w-4" />
                AGENT_NAME
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Lead Gen Bot v2"
                className="h-12 bg-zinc-900/50 border-white/10 font-mono text-white placeholder:text-zinc-600 focus:border-emerald-500/50"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-mono text-muted-foreground">DESCRIPTION</Label>
              <Textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="What does this agent do?"
                className="bg-zinc-900/50 border-white/10 font-mono text-white placeholder:text-zinc-600 resize-none focus:border-emerald-500/50"
                rows={3}
              />
            </div>

            {/* Spending Limits */}
            <div className="space-y-6 pt-4 border-t border-white/10">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                <h3 className="font-mono text-sm text-white">SPENDING_LIMITS</h3>
              </div>

              {/* Daily Limit */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    DAILY_VELOCITY
                  </Label>
                  <span className="text-xl font-mono font-bold text-emerald-400 glow-text">
                    {formatCurrency(formData.dailyLimit)}
                  </span>
                </div>
                <Slider
                  value={[formData.dailyLimit]}
                  onValueChange={([value]) => setFormData((prev) => ({ ...prev, dailyLimit: value ?? prev.dailyLimit }))}
                  min={50}
                  max={5000}
                  step={50}
                />
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>$50</span>
                  <span>$5,000</span>
                </div>
              </div>

              {/* Monthly Limit */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    MONTHLY_CEILING
                  </Label>
                  <span className="text-xl font-mono font-bold text-emerald-400 glow-text">
                    {formatCurrency(formData.monthlyLimit)}
                  </span>
                </div>
                <Slider
                  value={[formData.monthlyLimit]}
                  onValueChange={([value]) => setFormData((prev) => ({ ...prev, monthlyLimit: value ?? prev.monthlyLimit }))}
                  min={500}
                  max={50000}
                  step={500}
                />
                <div className="flex justify-between text-xs font-mono text-muted-foreground">
                  <span>$500</span>
                  <span>$50,000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-white/10 p-6">
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-bold text-lg glow disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Generating Card...
                </span>
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Issue Virtual Card
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
