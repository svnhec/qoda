import { Suspense } from "react"
import { StripeReturnContent } from "./stripe-return-content"

// Placeholder - Stripe Return Page
export default function StripeReturnPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <StripeReturnContent />
        </Suspense>
    )
}
