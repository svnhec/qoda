"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Check, Zap, Building2, Link2, Percent } from "lucide-react"
import { cn } from "@/lib/utils"

type Step = "identity" | "margins"

interface StepInfo {
  id: Step
  label: string
  icon: React.ElementType
}

const steps: StepInfo[] = [
  { id: "identity", label: "Agency Identity", icon: Building2 },
  { id: "margins", label: "Define Margins", icon: Percent },
]

// Card Preview Component
function CardPreview({ agencyName }: { agencyName: string }) {
  return (
    <motion.div
      className="w-56 h-36 rounded-2xl p-4 flex flex-col justify-between relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
      }}
      initial={{ rotateY: -10, rotateX: 5 }}
      animate={{ rotateY: 0, rotateX: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Chip */}
      <div className="flex justify-between items-start">
        <div className="w-10 h-7 rounded bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 border border-yellow-500/20" />
        <span className="text-primary font-bold text-sm glow-text-green">QODA</span>
      </div>

      {/* Card Number */}
      <div className="font-mono text-sm text-muted-foreground tracking-wider">•••• •••• •••• 4242</div>

      {/* Name */}
      <div className="text-sm font-medium truncate">{agencyName || "Your Agency"}</div>
    </motion.div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState<Step>("identity")

  // Form data
  const [agencyName, setAgencyName] = useState("")
  const [currency, setCurrency] = useState("USD")
  const [markup, setMarkup] = useState([15])

  const currentStepIndex = steps.findIndex((s) => s.id === currentStep)

  const handleNext = () => {
    console.log('handleNext called, current step:', currentStep, 'agency name:', agencyName)
    if (currentStep === "identity") {
      console.log('Setting step to margins')
      setCurrentStep("margins")
    } else if (currentStep === "margins") {
      console.log('Navigating to stripe-connect')
      router.push("/onboarding/stripe-connect")
    }
  }

  useEffect(() => {
    console.log('currentStep changed to:', currentStep)
  }, [currentStep])

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex">
      {/* Debug indicator */}
      <div className="fixed top-4 left-4 z-50 bg-red-500 text-white px-3 py-1 rounded text-sm font-mono">
        Current Step: {currentStep} | Agency: "{agencyName}"
      </div>

      {/* Background grid */}
      <div className="fixed inset-0 retro-grid opacity-30" />

      {/* Left side - Boot Sequence Progress */}
      <motion.div
        className="hidden md:flex w-80 border-r border-white/[0.04] p-8 flex-col"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-10">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center glow-green mb-4">
            <span className="text-primary font-bold text-lg">Q</span>
          </div>
          <h2 className="text-lg font-bold mb-1">System Initialization</h2>
          <p className="text-xs text-muted-foreground">Boot sequence in progress</p>
        </div>

        {/* Boot sequence steps */}
        <div className="space-y-4 flex-1">
          {/* Identity & Margins steps */}
          {steps.map((step, index) => {
            const StepIcon = step.icon
            const isComplete = index < currentStepIndex
            const isCurrent = step.id === currentStep
            const isPending = index > currentStepIndex

            return (
              <motion.div
                key={step.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl transition-all",
                  isCurrent && "bg-primary/5 border border-primary/20",
                  isComplete && "opacity-60",
                )}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-all",
                    isComplete && "bg-primary/20 text-primary",
                    isCurrent && "bg-primary/10 text-primary border border-primary/30",
                    isPending && "bg-white/5 text-muted-foreground",
                  )}
                >
                  {isComplete ? <Check className="w-4 h-4" /> : <StepIcon className="w-4 h-4" />}
                </div>
                <div className="flex-1">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      isPending && "text-muted-foreground",
                      isCurrent && "text-primary",
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                    {isComplete ? "[COMPLETE]" : isCurrent ? "[IN PROGRESS]" : "[PENDING]"}
                  </p>
                </div>
              </motion.div>
            )
          })}

          {/* Upcoming steps (shown as pending) */}
          <motion.div
            className="flex items-center gap-3 p-3 rounded-xl opacity-40"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 0.4, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-muted-foreground">
              <Link2 className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Connect Infrastructure</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">[PENDING]</p>
            </div>
          </motion.div>

          <motion.div
            className="flex items-center gap-3 p-3 rounded-xl opacity-40"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 0.4, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 text-muted-foreground">
              <Zap className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">System Ready</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">[PENDING]</p>
            </div>
          </motion.div>
        </div>

        {/* Progress indicator */}
        <div className="mt-auto pt-8">
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Boot Progress</span>
            <span className="tabular-nums">{Math.round(((currentStepIndex + 1) / 4) * 100)}%</span>
          </div>
          <div className="h-1 rounded-full bg-white/5 overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              animate={{ width: `${((currentStepIndex + 1) / 4) * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </motion.div>

      {/* Right side - Step Content */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <AnimatePresence mode="wait">
          {/* Step 1: Agency Identity */}
          {currentStep === "identity" && (
            <motion.div
              key="identity"
              className="w-full max-w-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 80, damping: 20 }}
            >
              <div className="flex flex-col md:flex-row gap-8 items-start">
                {/* Form */}
                <div className="flex-1 space-y-6">
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Agency Identity</h1>
                    <p className="text-sm text-muted-foreground">Configure your organization profile</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="agency-name" className="text-xs uppercase tracking-wider text-muted-foreground">
                        Agency Name
                      </Label>
                      <input
                        id="agency-name"
                        type="text"
                        value={agencyName}
                        onChange={(e) => {
                          console.log('Input changed:', e.target.value)
                          setAgencyName(e.target.value)
                        }}
                        onFocus={() => console.log('Input focused')}
                        onBlur={() => console.log('Input blurred')}
                        placeholder="Acme AI Agency"
                        className="bg-white/20 border border-white/20 text-white placeholder:text-gray-300 h-12 px-3 py-2 rounded-md w-full focus:outline-none focus:ring-2 focus:ring-primary cursor-text pointer-events-auto relative z-10"
                        autoFocus
                      />

                      {/* Debug display */}
                      <div className="mt-2 text-xs text-gray-400">
                        Current value: "{agencyName}" (length: {agencyName.length})
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="currency" className="text-xs uppercase tracking-wider text-muted-foreground">
                        Primary Currency
                      </Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger className="bg-white/20 border-white/20 text-white h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-white/20">
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    onClick={() => {
                      console.log('Continue button clicked, agencyName:', agencyName, 'disabled:', !agencyName.trim())
                      handleNext()
                    }}
                    disabled={!agencyName.trim()}
                    className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Continue
                    <motion.svg
                      className="w-4 h-4 ml-2"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M5 12h13M12 5l7 7-7 7" />
                    </motion.svg>
                  </Button>
                </div>

                {/* Card Preview */}
                <div className="flex flex-col items-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4">Card Preview</p>
                  <CardPreview agencyName={agencyName} />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Define Margins */}
          {currentStep === "margins" && (
            <motion.div
              key="margins"
              className="w-full max-w-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring" as const, stiffness: 80, damping: 20 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Define Margins</h1>
                <p className="text-sm text-muted-foreground">Set your global client markup percentage</p>
              </div>

              <div className="glass-card p-8 mb-6">
                {/* Markup Slider */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Global Markup</Label>
                    <span className="text-3xl font-bold text-primary glow-text-green tabular-nums">{markup[0]}%</span>
                  </div>
                  <Slider
                    value={markup}
                    onValueChange={setMarkup}
                    min={0}
                    max={50}
                    step={1}
                    className="[&_[role=slider]]:bg-primary [&_[role=slider]]:border-primary [&_[role=slider]]:shadow-[0_0_10px_oklch(0.8_0.2_155/0.5)]"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-2">
                    <span>0%</span>
                    <span>50%</span>
                  </div>
                </div>

                {/* Calculation Preview */}
                <motion.div
                  className="bg-black/30 rounded-xl p-4 font-mono text-sm"
                  key={markup[0]}
                  initial={{ scale: 0.98 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring" as const, stiffness: 200 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">AI Spend:</span>
                    <span className="tabular-nums">$100.00</span>
                  </div>
                  <div className="flex items-center justify-between mb-2 text-primary">
                    <span>Your Margin:</span>
                    <span className="tabular-nums">+${(100 * ((markup[0] ?? 0) / 100)).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-white/10 pt-2 flex items-center justify-between font-bold">
                    <span>Client Billed:</span>
                    <span className="text-primary glow-text-green tabular-nums">
                      ${(100 * (1 + (markup[0] ?? 0) / 100)).toFixed(2)}
                    </span>
                  </div>
                </motion.div>
              </div>

              <Button
                onClick={handleNext}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Continue to Stripe Setup
                <motion.svg
                  className="w-4 h-4 ml-2"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h13M12 5l7 7-7 7" />
                </motion.svg>
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
