/**
 * Waitlist API
 * =============================================================================
 * Handle waitlist signups for early access.
 * Stores emails in database for marketing and notifications.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendNotificationEmail } from "@/lib/email";

// Waitlist signup schema
const WaitlistSignupSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  source: z.string().optional().default("landing_page"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = WaitlistSignupSchema.parse(body);

    const serviceClient = createServiceClient();

    // Check if email already exists
    const { data: existingEntry } = await serviceClient
      .from("waitlist")
      .select("id, created_at")
      .eq("email", parsed.email.toLowerCase())
      .single();

    if (existingEntry) {
      return NextResponse.json({
        message: "You're already on the waitlist!",
        alreadySignedUp: true,
        signedUpAt: existingEntry.created_at
      });
    }

    // Add to waitlist
    const { data: waitlistEntry, error } = await serviceClient
      .from("waitlist")
      .insert({
        email: parsed.email.toLowerCase(),
        source: parsed.source,
        signup_ip: request.headers.get("x-forwarded-for") ||
                   request.headers.get("x-real-ip") ||
                   "unknown",
        user_agent: request.headers.get("user-agent") || "unknown",
      })
      .select("id, created_at")
      .single();

    if (error) {
      console.error("Failed to add to waitlist:", error);
      return NextResponse.json(
        { error: "Failed to join waitlist. Please try again." },
        { status: 500 }
      );
    }

    // Send welcome email (async - don't block response)
    try {
      await sendNotificationEmail({
        email: parsed.email,
        subject: "Welcome to Qoda - You're on the list! 🎯",
        message: `Thanks for your interest in Qoda!

You've successfully joined our waitlist for early access to the Financial Operating System for AI Agents.

What happens next:
• We'll notify you when early access opens
• You'll get exclusive updates on new features
• Priority access to beta testing

In the meantime, you can:
• Follow us on Twitter for updates
• Check out our GitHub for technical details
• Read our documentation

We're excited to have you join the AI automation revolution! 🚀

Best regards,
The Qoda Team`,
        actionUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}`,
        actionText: "Visit Qoda"
      });
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the signup if email fails
    }

    return NextResponse.json({
      message: "Successfully joined the waitlist!",
      waitlistId: waitlistEntry.id,
      position: "TBD", // Could implement position tracking later
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid email address",
          details: err.errors
        },
        { status: 400 }
      );
    }

    console.error("Waitlist signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// GET: Get waitlist stats (for admin dashboard)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // In a real app, you'd verify the JWT token here
  // For now, we'll just return basic stats

  const serviceClient = createServiceClient();

  try {
    const { count: totalSignups } = await serviceClient
      .from("waitlist")
      .select("*", { count: "exact", head: true });

    const { data: recentSignups } = await serviceClient
      .from("waitlist")
      .select("email, source, created_at")
      .order("created_at", { ascending: false })
      .limit(10);

    return NextResponse.json({
      totalSignups: totalSignups || 0,
      recentSignups: recentSignups || [],
    });

  } catch (err) {
    console.error("Failed to fetch waitlist stats:", err);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}



