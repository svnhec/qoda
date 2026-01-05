"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { motion } from "framer-motion"
import { ArrowLeft, Building2, Mail, Percent, Calendar, CheckCircle2, Loader2, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

export default function NewClientPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    markup: 20,
    billingCycle: "monthly" as "monthly" | "biweekly",
  })

  const handleSubmit = async () => {
    setIsSubmitting(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))
    setIsSubmitting(false)
    setIsComplete(true)
  }

  const isValid = formData.name.length > 0 && formData.email.includes("@")

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
          className="text-center space-y-6"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            className="mx-auto w-20 h-20 rounded-full bg-emerald-500/10 flex items-center justify-center"
          >
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">CLIENT_REGISTERED</h1>
            <p className="text-muted-foreground font-mono text-sm">{formData.name} has been added to the system</p>
          </div>
          <div className="flex items-center justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => router.push("/clients")}
              className="bg-transparent border-white/10"
            >
              View All Clients
            </Button>
            <Button
              onClick={() => router.push("/agents/new")}
              className="bg-emerald-500 hover:bg-emerald-600 text-black glow"
            >
              Issue First Card
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
            Back to Clients
          </Button>
        </motion.div>

        {/* Header */}
        <motion.div variants={itemVariants} className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-mono tracking-tight text-white">REGISTER_NEW_CLIENT</h1>
          <p className="text-muted-foreground">Configure a new client account to begin issuing cards</p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl border border-white/10 bg-black/40 backdrop-blur-xl overflow-hidden"
        >
          {/* Live Preview Card */}
          <div className="border-b border-white/10 p-6 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <p className="text-xs font-mono text-muted-foreground mb-4 tracking-wider">CARD_PREVIEW</p>
            <div className="relative w-72 h-44 rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-white/10 p-5 mx-auto">
              <div className="flex justify-between items-start">
                <div className="h-8 w-10 rounded bg-gradient-to-br from-amber-300 to-amber-500" />
                <span className="text-emerald-400 font-mono text-sm font-bold">QODA</span>
              </div>
              <div className="absolute bottom-5 left-5 right-5">
                <p className="font-mono text-sm text-zinc-400 mb-1">•••• •••• •••• 0000</p>
                <p className="font-mono text-xs text-white truncate">{formData.name || "Client Name"}</p>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="p-6 space-y-6">
            {/* Client Name */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Building2 className="h-4 w-4" />
                CLIENT_NAME
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Acme Corporation"
                className="h-12 bg-zinc-900/50 border-white/10 font-mono text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
            </div>

            {/* Billing Email */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Mail className="h-4 w-4" />
                BILLING_EMAIL
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="billing@acme.com"
                className="h-12 bg-zinc-900/50 border-white/10 font-mono text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:ring-emerald-500/20"
              />
            </div>

            {/* Markup Slider */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                  <Percent className="h-4 w-4" />
                  MARKUP_PERCENTAGE
                </Label>
                <span className="text-2xl font-mono font-bold text-emerald-400 glow-text">{formData.markup}%</span>
              </div>
              <Slider
                value={[formData.markup]}
                onValueChange={([value]) => setFormData((prev) => ({ ...prev, markup: value }))}
                min={5}
                max={50}
                step={1}
                className="py-2"
              />
              <div className="flex justify-between text-xs font-mono text-muted-foreground">
                <span>5%</span>
                <span>50%</span>
              </div>
              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                <p className="text-xs text-emerald-400 font-mono">
                  CLIENT_PAYS: $100 spend → ${(100 * (1 + formData.markup / 100)).toFixed(2)} billed
                </p>
              </div>
            </div>

            {/* Billing Cycle */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2 text-sm font-mono text-muted-foreground">
                <Calendar className="h-4 w-4" />
                BILLING_CYCLE
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {(["monthly", "biweekly"] as const).map((cycle) => (
                  <button
                    key={cycle}
                    onClick={() => setFormData((prev) => ({ ...prev, billingCycle: cycle }))}
                    className={cn(
                      "p-4 rounded-xl border text-left transition-all",
                      formData.billingCycle === cycle
                        ? "border-emerald-500/50 bg-emerald-500/10"
                        : "border-white/10 bg-zinc-900/30 hover:border-white/20",
                    )}
                  >
                    <p className="font-mono text-sm text-white capitalize">{cycle}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {cycle === "monthly" ? "Invoice on 1st" : "Invoice bi-weekly"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-white/10 p-6">
            <Button
              onClick={handleSubmit}
              disabled={!isValid || isSubmitting}
              className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-black font-mono font-bold text-lg glow disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <CreditCard className="mr-2 h-5 w-5" />
                  Register Client
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
