import { signIn } from "@/lib/actions/auth"
import { applyDistributedRateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // Apply rate limiting to prevent brute force attacks
  const rateLimitResult = await applyDistributedRateLimit(request, "AUTH")
  if (rateLimitResult) {
    return rateLimitResult
  }

  try {
    const formData = await request.formData()
    const result = await signIn(formData)

    if (result.success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }
  } catch (error) {
    console.error("Signin API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
