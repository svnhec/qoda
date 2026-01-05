import { signUp } from "@/lib/actions/auth"
import { applyDistributedRateLimit } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  // Apply rate limiting to prevent abuse
  const rateLimitResult = await applyDistributedRateLimit(request, "AUTH")
  if (rateLimitResult) {
    return rateLimitResult
  }

  try {
    const formData = await request.formData()
    const result = await signUp(formData)

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message })
    } else {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 })
    }
  } catch (error) {
    console.error("Signup API error:", error)
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    )
  }
}
