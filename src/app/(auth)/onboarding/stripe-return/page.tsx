import { Suspense } from "react"
import { StripeReturnContent } from "./stripe-return-content"

function LoadingFallback() {
  return (
    <div className="w-full max-w-xl">
      <div className="rounded-2xl overflow-hidden border-2 border-white/10 bg-black/50">
        <div className="flex items-center gap-2 px-4 py-3 bg-black/50 border-b border-white/10">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-xs font-mono text-muted-foreground ml-2">qoda_verification_protocol.sh</span>
        </div>
        <div className="p-6 font-mono text-sm min-h-[300px] flex items-center justify-center">
          <div className="flex items-center gap-2 text-yellow-500">
            <span>INITIALIZING</span>
            <span className="inline-block w-2.5 h-5 bg-yellow-500 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default function StripeReturnPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Suspense fallback={<LoadingFallback />}>
        <StripeReturnContent />
      </Suspense>
    </div>
  )
}
